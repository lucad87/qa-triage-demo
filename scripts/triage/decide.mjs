#!/usr/bin/env node
// QA triage — decision layer.
//
// Runs the Laya System-1 decision model (ONNX Runtime, CPU-only) over the
// distilled Playwright failure "state" documents in a directory and routes
// each one to a triage bucket:
//   flake-tracker / env-alert / test-fix / product-report / escalate
//
// Thresholds: --conf 0.30 (origin confidence gate) and --min-noul 0.65 (noul
// gate for test/product routes) are fitted on the 92-state labeled corpus:
// at this operating point the corpus routes 77/92 states automatically with
// zero wrong decisions (100% precision). Re-fit whenever the corpus changes.
//
// Usage:
//   node scripts/triage/decide.mjs --states <dir> --out <file.json> [--conf 0.30] [--min-noul 0.65] [--subfolder <name>] [--model-dir <path>]

import fs from "node:fs";
import path from "node:path";
import { Laya } from "@receptron/laya";

const USAGE =
  "usage: node scripts/triage/decide.mjs --states <dir> --out <file.json> [--conf 0.30] [--min-noul 0.65] [--subfolder <name>] [--model-dir <path>]";
const DEFAULT_CONF = 0.3;
const DEFAULT_MIN_NOUL = 0.65;

const QUESTIONS = {
  origin: {
    type: "choice",
    instructions: "What is the most likely origin of this Playwright test failure?",
    criteria: {
      test: "the test is wrong or outdated: selector drift, stale assertion, wrong fixture data, missing wait inside the test",
      product: "the app under test is broken: a real regression the test correctly detects",
      flake: "timing or randomness: the same test passes on retry with no code change",
      environment: "test environment, browser, ports or infrastructure misconfiguration"
    }
  },
  test_side: { type: "noul", instructions: "Does this failure originate in the test rather than the product?" },
  product_side: { type: "noul", instructions: "Is this a genuine regression of the app under test that the test correctly detects?" },
  severity: { type: "score", instructions: "How severe is this failure for the product?", criteria: ["cosmetic", "degraded behavior", "broken user flow", "data loss or auth outage"] }
};

const KNOWN_STATE_FIELDS = ["test", "spec", "status", "retry", "error", "changedFiles"];

class CliError extends Error {}

const fmt = (n) => n.toFixed(2);

function parseThreshold(value, flag) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new CliError(`${flag} expects a number, got "${value}"`);
  return n;
}

function parseArgs(argv) {
  const args = { states: null, out: null, conf: DEFAULT_CONF, minNoul: DEFAULT_MIN_NOUL, subfolder: null, modelDir: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    let flag = raw;
    let inline = null;
    if (raw.startsWith("--") && raw.includes("=")) {
      const eq = raw.indexOf("=");
      flag = raw.slice(0, eq);
      inline = raw.slice(eq + 1);
    }
    const takeValue = () => {
      if (inline !== null) return inline;
      if (i + 1 >= argv.length) throw new CliError(`missing value for ${flag}`);
      return argv[++i];
    };
    switch (flag) {
      case "--states":
        args.states = takeValue();
        break;
      case "--out":
        args.out = takeValue();
        break;
      case "--conf":
        args.conf = parseThreshold(takeValue(), flag);
        break;
      case "--min-noul":
        args.minNoul = parseThreshold(takeValue(), flag);
        break;
      case "--subfolder":
        args.subfolder = takeValue();
        break;
      case "--model-dir":
        args.modelDir = takeValue();
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        throw new CliError(`unknown argument "${raw}"`);
    }
  }
  if (!args.help) {
    if (!args.states) throw new CliError("--states <dir> is required");
    if (!args.out) throw new CliError("--out <file.json> is required");
  }
  return args;
}

const normalizePath = (p) => (process.platform === "win32" ? path.resolve(p).toLowerCase() : path.resolve(p));

function loadStates(dir, outPath) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`cannot read states directory "${dir}": ${err.message}`);
  }

  const outKey = normalizePath(outPath);
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith(".json") && name.toLowerCase() !== "index.json")
    .filter((name) => normalizePath(path.join(dir, name)) !== outKey)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (files.length === 0) {
    throw new Error(
      `no state documents (*.json, excluding index.json) found in "${dir}" — refusing to run on an empty states dir`,
    );
  }

  const states = [];
  for (const name of files) {
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    } catch (err) {
      throw new Error(`cannot parse state "${name}": ${err.message}`);
    }
    if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
      const kind = doc === null ? "null" : Array.isArray(doc) ? "array" : typeof doc;
      throw new Error(`invalid state "${name}": expected a JSON object, got ${kind}`);
    }
    if (doc.model === "laya" && Array.isArray(doc.decisions)) {
      console.error(`[decide] skipping "${name}": looks like a previous decide output, not a state document`);
      continue;
    }
    if (!KNOWN_STATE_FIELDS.some((field) => field in doc)) {
      throw new Error(
        `invalid state "${name}": missing failure fields — expected at least one of ${KNOWN_STATE_FIELDS.join(", ")}`,
      );
    }
    states.push({ file: name, state: doc });
  }

  if (states.length === 0) {
    throw new Error(`no usable state documents found in "${dir}" — refusing to run`);
  }
  return states;
}

function answerField(answers, key, field, file, kind) {
  const group = answers?.[key];
  const value = group?.[field];
  if (value === undefined || value === null) {
    throw new Error(`state "${file}": model answer "${key}.${field}" is missing (got ${JSON.stringify(group ?? null)})`);
  }
  if (kind === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`state "${file}": model answer "${key}.${field}" is not a finite number (got ${JSON.stringify(value)})`);
  }
  if (kind === "string" && typeof value !== "string") {
    throw new Error(`state "${file}": model answer "${key}.${field}" is not a string (got ${JSON.stringify(value)})`);
  }
  return value;
}

function decideFor(answers, file, conf, minNoul) {
  const primary = answerField(answers, "origin", "choice", file, "string");
  const originConf = answerField(answers, "origin", "confidence", file, "number");
  const testSide = answerField(answers, "test_side", "noul", file, "number");
  const productSide = answerField(answers, "product_side", "noul", file, "number");
  answerField(answers, "severity", "score", file, "number"); // surfaced in raw answers; not a gate in v0

  const p = answers?.origin?.probabilities?.[primary];
  const reasons = [
    `origin=${primary} (${typeof p === "number" ? `p=${fmt(p)}, ` : ""}conf=${fmt(originConf)})`,
  ];

  if (primary === "flake") {
    reasons.push("origin=flake");
    if (originConf >= conf) {
      reasons.push(`conf ${fmt(originConf)} >= ${fmt(conf)} → flake-tracker`);
      return { route: "flake-tracker", reasons };
    }
    reasons.push(`conf ${fmt(originConf)} < ${fmt(conf)} → escalate`);
    return { route: "escalate", reasons };
  }
  if (primary === "environment") {
    reasons.push("origin=environment");
    if (originConf >= conf) {
      reasons.push(`conf ${fmt(originConf)} >= ${fmt(conf)} → env-alert`);
      return { route: "env-alert", reasons };
    }
    reasons.push(`conf ${fmt(originConf)} < ${fmt(conf)} → escalate`);
    return { route: "escalate", reasons };
  }
  if (primary === "test") {
    reasons.push(`test_side=${fmt(testSide)}`);
    const failedGates = [];
    if (originConf < conf) failedGates.push(`conf ${fmt(originConf)} < ${fmt(conf)}`);
    if (testSide < minNoul) failedGates.push(`test_side ${fmt(testSide)} < ${fmt(minNoul)}`);
    if (failedGates.length === 0) {
      reasons.push(`conf ${fmt(originConf)} >= ${fmt(conf)} and test_side ${fmt(testSide)} >= ${fmt(minNoul)} → test-fix`);
      return { route: "test-fix", reasons };
    }
    for (const gate of failedGates) reasons.push(`${gate} → escalate`);
    return { route: "escalate", reasons };
  }
  if (primary === "product") {
    reasons.push(`product_side=${fmt(productSide)}`);
    const failedGates = [];
    if (originConf < conf) failedGates.push(`conf ${fmt(originConf)} < ${fmt(conf)}`);
    if (productSide < minNoul) failedGates.push(`product_side ${fmt(productSide)} < ${fmt(minNoul)}`);
    if (failedGates.length === 0) {
      reasons.push(
        `conf ${fmt(originConf)} >= ${fmt(conf)} and product_side ${fmt(productSide)} >= ${fmt(minNoul)} → product-report`,
      );
      return { route: "product-report", reasons };
    }
    for (const gate of failedGates) reasons.push(`${gate} → escalate`);
    return { route: "escalate", reasons };
  }
  reasons.push(`unknown origin choice "${primary}" → escalate`);
  return { route: "escalate", reasons };
}

function printTable(decisions) {
  const headers = ["state", "route", "origin", "conf"];
  const rows = decisions.map((d) => [
    d.state,
    d.route,
    d.answers.origin.choice,
    fmt(d.answers.origin.confidence),
  ]);
  const widths = headers.map((header, i) => Math.max(header.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd();
  console.log(line(headers));
  for (const row of rows) console.log(line(row));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const outPath = path.resolve(args.out);
  const states = loadStates(args.states, outPath);
  console.error(`[decide] ${states.length} state document(s) from ${args.states}`);

  const loadStart = performance.now();
  let laya;
  try {
    const loadOpts = {};
    if (args.modelDir) loadOpts.modelDir = args.modelDir;
    else if (args.subfolder) loadOpts.subfolder = args.subfolder;
    laya = await Laya.load(loadOpts);
  } catch (err) {
    throw new Error(`failed to load the Laya model: ${err.message}`);
  }
  console.error(
    `[decide] laya ready in ${Math.round(performance.now() - loadStart)} ms (modelDir: ${laya.modelDir ?? "unknown"})`,
  );

  const decisions = [];
  try {
    for (const { file, state } of states) {
      const start = performance.now();
      let result;
      try {
        result = await laya.systemOne(state, QUESTIONS);
      } catch (err) {
        throw new Error(`inference failed for state "${file}": ${err.message}`);
      }
      const timingMs = Math.round(performance.now() - start);
      const { route, reasons } = decideFor(result?.answers, file, args.conf, args.minNoul);
      decisions.push({
        state: file,
        ...(typeof state.test === "string" ? { test: state.test } : {}),
        answers: result?.answers,
        usage: result?.usage,
        route,
        reasons,
        timingMs,
      });
    }
  } finally {
    await laya.close();
  }

  const byRoute = {};
  let totalMs = 0;
  for (const decision of decisions) {
    byRoute[decision.route] = (byRoute[decision.route] ?? 0) + 1;
    totalMs += decision.timingMs;
  }
  const output = {
    model: "laya",
    checkpoint: args.modelDir ?? args.subfolder ?? "default",
    generatedAt: new Date().toISOString(),
    questions: QUESTIONS,
    thresholds: { conf: args.conf, minNoul: args.minNoul },
    decisions,
    summary: {
      total: decisions.length,
      byRoute,
      avgTimingMs: decisions.length ? Math.round(totalMs / decisions.length) : 0,
    },
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.error(`[decide] wrote ${outPath}`);

  printTable(decisions);
  const routeSummary = Object.entries(byRoute)
    .map(([route, count]) => `${route}=${count}`)
    .join(", ");
  console.log(`summary: total=${output.summary.total} byRoute={${routeSummary}} avgTimingMs=${output.summary.avgTimingMs}`);
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.error(`[decide] ${err.message}`);
    console.error(USAGE);
  } else {
    console.error(`[decide] error: ${err?.message ?? err}`);
  }
  process.exit(1);
});
