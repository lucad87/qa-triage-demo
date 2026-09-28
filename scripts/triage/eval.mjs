#!/usr/bin/env node
// QA triage — evaluation layer.
//
// Scores the routing decisions produced by scripts/triage/decide.mjs against
// the ground-truth class labels recorded in each run's scenario.json:
//   test -> test-fix, product -> product-report,
//   flake -> flake-tracker, environment -> env-alert.
//
// Runs with class "baseline" (or an unknown class) are skipped. "escalate"
// counts as an abstention — neither correct nor wrong — and only lowers
// coverage. Every other route is an auto decision, correct iff it equals the
// expected route.
//
// The collector may still be writing runs/ while this runs, so missing,
// partially written or vanishing run dirs are skipped, never fatal.
//
// Usage:
//   node scripts/triage/eval.mjs [--runs runs] [--out runs/eval-report.md] [--json runs/eval-report.json]

import fs from "node:fs";
import path from "node:path";

const USAGE =
  "usage: node scripts/triage/eval.mjs [--runs runs] [--out runs/eval-report.md] [--json runs/eval-report.json]";

const EXPECTED_ROUTE = {
  test: "test-fix",
  product: "product-report",
  flake: "flake-tracker",
  environment: "env-alert",
};
const ABSTAIN = "escalate";
const SKIP_REASONS = ["no-scenario", "baseline", "unknown-class", "no-decisions", "invalid-decisions"];

class CliError extends Error {}

const fmt = (n) => n.toFixed(2);
const fmtRatio = (n) => (n === null ? "n/a" : n.toFixed(2));

function parseArgs(argv) {
  const args = { runs: "runs", out: "runs/eval-report.md", json: "runs/eval-report.json", help: false };
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
      case "--runs":
        args.runs = takeValue();
        break;
      case "--out":
        args.out = takeValue();
        break;
      case "--json":
        args.json = takeValue();
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        throw new CliError(`unknown argument "${raw}"`);
    }
  }
  return args;
}

function readJson(file) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { ok: false, value: null };
  }
}

const pickString = (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null);
const pickNumber = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

function scanRuns(runsDir) {
  let entries;
  try {
    entries = fs.readdirSync(runsDir, { withFileTypes: true });
  } catch {
    return null;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const skip = Object.fromEntries(SKIP_REASONS.map((reason) => [reason, 0]));
  const runs = [];
  let scanned = 0;

  for (const entry of entries) {
    let isDir = false;
    try {
      isDir = entry.isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;
    scanned++;

    const dir = path.join(runsDir, entry.name);
    const scenario = readJson(path.join(dir, "scenario.json"));
    if (!scenario.ok || scenario.value === null || typeof scenario.value !== "object" || Array.isArray(scenario.value)) {
      skip["no-scenario"]++;
      continue;
    }
    const cls = pickString(scenario.value.class)?.toLowerCase() ?? "";
    if (cls === "baseline") {
      skip.baseline++;
      continue;
    }
    const expected = EXPECTED_ROUTE[cls];
    if (!expected) {
      skip["unknown-class"]++;
      continue;
    }

    const decisions = readJson(path.join(dir, "decisions.json"));
    if (!decisions.ok) {
      skip["no-decisions"]++;
      continue;
    }
    const list =
      decisions.value !== null && typeof decisions.value === "object" && !Array.isArray(decisions.value)
        ? decisions.value.decisions
        : null;
    if (!Array.isArray(list)) {
      skip["invalid-decisions"]++;
      continue;
    }

    runs.push({
      id: pickString(scenario.value.id) ?? entry.name,
      class: cls,
      expected,
      decisions: list,
    });
  }

  return { scanned, skip, runs };
}

function buildRow(run, decision) {
  if (decision === null || typeof decision !== "object" || Array.isArray(decision)) return null;
  const predicted = typeof decision.route === "string" ? decision.route.trim() : "";
  if (!predicted) return null;

  const abstain = predicted === ABSTAIN;
  const answers = decision.answers !== null && typeof decision.answers === "object" ? decision.answers : {};

  return {
    scenario: run.id,
    class: run.class,
    state: pickString(decision.state) ?? "-",
    test: pickString(decision.test) ?? "-",
    expected: run.expected,
    predicted,
    correct: abstain ? null : predicted === run.expected,
    abstain,
    origin: pickString(answers?.origin?.choice),
    originConfidence: pickNumber(answers?.origin?.confidence),
    testSide: pickNumber(answers?.test_side?.noul),
    productSide: pickNumber(answers?.product_side?.noul),
  };
}

function aggregate(rows) {
  let auto = 0;
  let correct = 0;
  let abstain = 0;
  for (const row of rows) {
    if (row.abstain) abstain++;
    else {
      auto++;
      if (row.correct === true) correct++;
    }
  }
  const total = rows.length;
  return {
    total,
    auto,
    correct,
    wrong: auto - correct,
    abstain,
    accuracy_on_auto: auto > 0 ? correct / auto : null,
    coverage: total > 0 ? auto / total : null,
  };
}

const mdCell = (value) =>
  String(value)
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();

function mdTable(headers, rows) {
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const row of rows) lines.push(`| ${row.map(mdCell).join(" | ")} |`);
  return lines.join("\n");
}

const summaryRow = (agg) => [
  agg.total,
  agg.auto,
  agg.correct,
  agg.wrong,
  agg.abstain,
  fmtRatio(agg.accuracy_on_auto),
  fmtRatio(agg.coverage),
];

function renderMarkdown(report) {
  const lines = [];
  lines.push("# QA triage evaluation");
  lines.push("");
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Runs dir: \`${report.runsDir}\``);
  lines.push(`- Run dirs scanned: ${report.scanned} (usable: ${report.usable})`);
  const skipBits = Object.entries(report.skip)
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => `${reason}=${count}`);
  lines.push(`- Skipped run dirs: ${skipBits.length > 0 ? skipBits.join(", ") : "none"}`);
  if (report.skippedDecisions > 0) lines.push(`- Skipped malformed decision entries: ${report.skippedDecisions}`);
  lines.push("");

  if (report.rows.length === 0) {
    lines.push("_no decisions found yet_");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Summary");
  lines.push("");
  lines.push("**Overall**");
  lines.push("");
  lines.push(
    mdTable(
      ["total", "auto", "correct", "wrong", "abstain", "accuracy_on_auto", "coverage"],
      [summaryRow(report.overall)],
    ),
  );
  lines.push("");
  lines.push("**By class**");
  lines.push("");
  lines.push(
    mdTable(
      ["class", "expected", "total", "auto", "correct", "wrong", "abstain", "accuracy_on_auto", "coverage"],
      Object.entries(report.byClass).map(([cls, agg]) => [cls, EXPECTED_ROUTE[cls], ...summaryRow(agg)]),
    ),
  );
  lines.push("");
  lines.push("## Detail");
  lines.push("");
  lines.push(
    mdTable(
      ["scenario", "state", "test", "expected", "predicted", "correct", "origin", "conf", "test_side", "product_side"],
      report.rows.map((row) => [
        row.scenario,
        row.state,
        row.test,
        row.expected,
        row.predicted,
        row.abstain ? "-" : row.correct ? "yes" : "no",
        row.origin ?? "-",
        row.originConfidence === null ? "-" : fmt(row.originConfidence),
        row.testSide === null ? "-" : fmt(row.testSide),
        row.productSide === null ? "-" : fmt(row.productSide),
      ]),
    ),
  );
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const runsDir = path.resolve(args.runs);
  const outPath = path.resolve(args.out);
  const jsonPath = path.resolve(args.json);

  const scan = scanRuns(runsDir);
  const scanned = scan ? scan.scanned : 0;
  const skip = scan ? scan.skip : Object.fromEntries(SKIP_REASONS.map((reason) => [reason, 0]));
  const runs = scan ? scan.runs : [];

  const rows = [];
  let skippedDecisions = 0;
  for (const run of runs) {
    for (const decision of run.decisions) {
      const row = buildRow(run, decision);
      if (row) rows.push(row);
      else skippedDecisions++;
    }
  }

  const overall = aggregate(rows);
  const byClass = {};
  for (const cls of Object.keys(EXPECTED_ROUTE)) {
    const classRows = rows.filter((row) => row.class === cls);
    if (classRows.length > 0) byClass[cls] = aggregate(classRows);
  }

  const generatedAt = new Date().toISOString();
  const markdown = renderMarkdown({
    generatedAt,
    runsDir,
    scanned,
    usable: runs.length,
    skip,
    skippedDecisions,
    rows,
    overall,
    byClass,
  });

  const jsonReport = {
    generatedAt,
    runsDir,
    expectedRoutes: EXPECTED_ROUTE,
    runDirs: { scanned, usable: runs.length, skipped: skip, skippedDecisions },
    decisions: rows,
    summary: { overall, byClass },
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${markdown}\n`);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(jsonReport, null, 2)}\n`);

  if (rows.length === 0) {
    console.log(`eval: no decisions found yet (${scanned} run dir(s) scanned under ${runsDir}, ${runs.length} usable)`);
  } else {
    console.log(markdown);
  }

  const skipBits = Object.entries(skip)
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => `${reason}=${count}`);
  if (skipBits.length > 0) console.error(`[eval] skipped run dirs: ${skipBits.join(", ")}`);
  if (skippedDecisions > 0) console.error(`[eval] skipped malformed decision entries: ${skippedDecisions}`);
  console.error(`[eval] wrote ${outPath}`);
  console.error(`[eval] wrote ${jsonPath}`);
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.error(`[eval] ${err.message}`);
    console.error(USAGE);
  } else {
    console.error(`[eval] error: ${err?.message ?? err}`);
  }
  process.exit(1);
});
