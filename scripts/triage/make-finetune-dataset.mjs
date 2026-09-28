#!/usr/bin/env node
// Fine-tune dataset generator.
//
// Turns the labeled failure corpus in runs/ into rows for Laya's official
// fine-tuning flow (notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb).
//
// Row format mirrors the public dataset the notebook trains on
// (LocalLLaMA/typed-decisions): { id, workflow, state, questions, gold },
// where state/questions/gold are JSON strings and
// gold[question] = { type, label, probabilities, confidence, ... }.
// Probabilities are soft targets (the notebook trains with proper scoring
// rules against them); here they are derived from the scenario ground truth
// with mild smoothing.
//
// Splitting is BY SCENARIO (never by state) to avoid leakage: states from one
// fault injection are near-duplicates. Default: hold out the alphabetically
// last group of each class that has more than one group; override with
// --val-scenarios a,b.
//
// Usage:
//   node scripts/triage/make-finetune-dataset.mjs [--runs runs] [--out finetune] [--val-scenarios id1,id2]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Mirror of the question set in scripts/triage/decide.mjs — keep in sync.
const QUESTIONS = {
  origin: {
    type: "choice",
    instructions: "What is the most likely origin of this Playwright test failure?",
    criteria: {
      test: "the test is wrong or outdated: selector drift, stale assertion, wrong fixture data, missing wait inside the test",
      product: "the app under test is broken: a real regression the test correctly detects",
      flake: "timing or randomness: the same test passes on retry with no code change",
      environment: "test environment, browser, ports or infrastructure misconfiguration",
    },
  },
  test_side: { type: "noul", instructions: "Does this failure originate in the test rather than the product?" },
  product_side: { type: "noul", instructions: "Is this a genuine regression of the app under test that the test correctly detects?" },
  severity: {
    type: "score",
    instructions: "How severe is this failure for the product?",
    criteria: ["cosmetic", "degraded behavior", "broken user flow", "data loss or auth outage"],
  },
};

const CLASSES = ["test", "product", "flake", "environment"];

// Heuristic severity labels (0..3). Product bugs get a per-scenario judgement;
// everything else has no product impact in this corpus. Refine before any
// serious training run.
const SEVERITY_BY_RUN = {
  "product-create-api-500": 2,
  "product-toggle-not-persisted": 2,
  "product-counter-counts-all": 1,
  "product-done-filter-inverted": 1,
  "product-empty-state-missing": 0,
};
const SEVERITY_BY_CLASS = { product: 1, test: 0, flake: 0, environment: 0 };

// Effective split groups: runs that are evidence sub-runs of another scenario.
const GROUP_ALIAS = { "flake-evidence": "flake-random-refresh" };

const round6 = (x) => Math.round(x * 1e6) / 1e6;

function softDistribution(keys, topKey, topProbability) {
  const others = keys.filter((k) => k !== topKey);
  const rest = others.length > 0 ? (1 - topProbability) / others.length : 0;
  const dist = {};
  for (const k of keys) dist[k] = k === topKey ? round6(topProbability) : round6(rest);
  return dist;
}

function buildGold(runId, cls) {
  const severityLevel = SEVERITY_BY_RUN[runId] ?? SEVERITY_BY_CLASS[cls] ?? 0;
  const severityProbs = softDistribution(["0", "1", "2", "3"], String(severityLevel), 0.7);
  const severityScore = round6(Object.entries(severityProbs).reduce((s, [k, p]) => s + Number(k) * p, 0));
  const testSide = cls === "test";
  const productSide = cls === "product";
  return {
    origin: {
      type: "choice",
      label: cls,
      probabilities: softDistribution(CLASSES, cls, 0.9),
      confidence: 0.9,
    },
    test_side: {
      type: "noul",
      label: testSide ? "true" : "false",
      probabilities: { false: round6(testSide ? 0.1 : 0.9), true: round6(testSide ? 0.9 : 0.1) },
      noul: round6(testSide ? 0.9 : 0.1),
      confidence: 0.9,
    },
    product_side: {
      type: "noul",
      label: productSide ? "true" : "false",
      probabilities: { false: round6(productSide ? 0.1 : 0.9), true: round6(productSide ? 0.9 : 0.1) },
      noul: round6(productSide ? 0.9 : 0.1),
      confidence: 0.9,
    },
    severity: {
      type: "score",
      label: String(severityLevel),
      probabilities: severityProbs,
      score: severityScore,
      confidence: 0.7,
    },
  };
}

function parseArgs(argv) {
  const args = { runs: "runs", out: "finetune", valScenarios: null };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--runs") args.runs = argv[++i];
    else if (flag === "--out") args.out = argv[++i];
    else if (flag === "--val-scenarios") args.valScenarios = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
  }
  return args;
}

function collectRows(runsDir) {
  const rows = [];
  const runDirs = fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const name of runDirs) {
    const dir = path.join(runsDir, name);
    const scenarioPath = path.join(dir, "scenario.json");
    if (!fs.existsSync(scenarioPath)) continue;
    const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
    const cls = scenario.class;
    if (!CLASSES.includes(cls)) continue; // skips "baseline"
    const statesDir = path.join(dir, "states");
    if (!fs.existsSync(statesDir)) continue;
    const stateFiles = fs
      .readdirSync(statesDir)
      .filter((f) => f.startsWith("state-") && f.endsWith(".json"))
      .sort();
    for (const file of stateFiles) {
      const state = JSON.parse(fs.readFileSync(path.join(statesDir, file), "utf8"));
      rows.push({
        id: `${name}_${file.replace(/\.json$/, "")}`,
        workflow: "playwright-triage",
        state: JSON.stringify(state),
        questions: JSON.stringify(QUESTIONS),
        gold: JSON.stringify(buildGold(name, cls)),
        _run: name,
        _group: GROUP_ALIAS[name] ?? name,
        _class: cls,
      });
    }
  }
  return rows;
}

function defaultValGroups(rows) {
  const groupsByClass = {};
  for (const row of rows) {
    const cls = row._class;
    (groupsByClass[cls] ??= new Set()).add(row._group);
  }
  const val = new Set();
  for (const groups of Object.values(groupsByClass)) {
    const sorted = [...groups].sort();
    if (sorted.length > 1) val.add(sorted[sorted.length - 1]);
  }
  return val;
}

function toLine(row) {
  return `${JSON.stringify({ id: row.id, workflow: row.workflow, state: row.state, questions: row.questions, gold: row.gold })}\n`;
}

function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map(toLine).join(""));
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] ?? 0) + 1;
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const runsDir = path.resolve(root, args.runs);
  const outDir = path.resolve(root, args.out);

  const rows = collectRows(runsDir);
  if (rows.length === 0) {
    console.error(`[make-finetune-dataset] no labeled states found under ${runsDir}`);
    process.exit(1);
  }

  const valGroups = args.valScenarios ? new Set(args.valScenarios) : defaultValGroups(rows);
  const trainRows = rows.filter((r) => !valGroups.has(r._group));
  const valRows = rows.filter((r) => valGroups.has(r._group));
  if (trainRows.length === 0 || valRows.length === 0) {
    console.error("[make-finetune-dataset] degenerate split (empty train or val) — adjust --val-scenarios");
    process.exit(1);
  }

  writeJsonl(path.join(outDir, "laya-triage.all.jsonl"), rows);
  writeJsonl(path.join(outDir, "laya-triage.train.jsonl"), trainRows);
  writeJsonl(path.join(outDir, "laya-triage.val.jsonl"), valRows);

  const summary = {
    generatedAt: new Date().toISOString(),
    runsDir,
    outDir,
    totals: { all: rows.length, train: trainRows.length, val: valRows.length },
    byClass: countBy(rows, "_class"),
    byScenario: countBy(rows, "_run"),
    valGroups: [...valGroups].sort(),
    files: {
      all: "laya-triage.all.jsonl",
      train: "laya-triage.train.jsonl",
      val: "laya-triage.val.jsonl",
    },
    notes: [
      "Split is by scenario group (GROUP_ALIAS maps evidence sub-runs to their scenario).",
      "Severity labels are heuristic (SEVERITY_BY_RUN / SEVERITY_BY_CLASS in the generator).",
      "State/questions/gold are JSON strings, mirroring LocalLLaMA/typed-decisions.",
    ],
  };
  fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`[make-finetune-dataset] ${rows.length} rows → ${path.relative(root, outDir)}`);
  console.log(`  train: ${trainRows.length} rows | val: ${valRows.length} rows (groups: ${[...valGroups].sort().join(", ")})`);
  console.log(`  by class: ${Object.entries(summary.byClass).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  console.log(`  files: laya-triage.all.jsonl / laya-triage.train.jsonl / laya-triage.val.jsonl / summary.json`);
}

main();
