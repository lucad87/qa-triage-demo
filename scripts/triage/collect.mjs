#!/usr/bin/env node
// Corpus collector for the triage demo.
//
// For each fault scenario:
//   1. apply its edits (scripts/scenarios/apply.mjs)
//   2. run the Playwright suite fresh (kill any leftover server on :3100 first)
//   3. snapshot artifacts into runs/<id>/attempt-<n>/
//   4. revert the edits and verify the tree is clean again
//
// Flake scenarios (JSON "repeat": true) are run multiple times until the
// collector has seen both a failing attempt and a green attempt (evidence of
// nondeterminism), capped by --flake-attempts.
//
// Usage:
//   node scripts/triage/collect.mjs
//   node scripts/triage/collect.mjs --only product-counter-counts-all,flake-random-refresh
//   node scripts/triage/collect.mjs --retries 1 --flake-attempts 6
//
// Note: port cleanup is Windows-only for now (netstat/taskkill).

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const runsDir = path.join(root, "runs");
const PORT = 3100;
const BASELINE = {
  id: "baseline",
  class: "baseline",
  title: "Baseline: suite green",
  edits: [],
  changedFiles: [],
  expectedFailure: null,
};

const args = { only: null, retries: 1, flakeAttempts: 6 };
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag === "--only") args.only = process.argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
  else if (flag === "--retries") args.retries = Number(process.argv[++i]);
  else if (flag === "--flake-attempts") args.flakeAttempts = Number(process.argv[++i]);
}

function sh(cmd) {
  return spawnSync(cmd, { shell: true, cwd: root, encoding: "utf8" });
}

function killPort(port) {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(new RegExp(`:${port}\\s.*LISTENING\\s+(\\d+)\\s*$`));
      if (m) pids.add(m[1]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      } catch {
        // already gone
      }
    }
  } catch {
    // no listener — nothing to kill
  }
}

function loadScenarios() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "scenarios", "manifest.json"), "utf8"));
  return manifest.scenarios.map((entry) => {
    const scenario = JSON.parse(fs.readFileSync(path.join(root, entry.file), "utf8"));
    scenario.changedFiles = [...new Set(scenario.edits.map((e) => e.file))];
    return scenario;
  });
}

function classifyResults(resultsPath) {
  const data = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
  const failed = [];
  const flaky = [];
  const passed = [];
  const walkSuite = (suite) => {
    for (const child of suite.suites ?? []) walkSuite(child);
    for (const spec of suite.specs ?? []) {
      const statuses = (spec.tests ?? []).flatMap((t) => (t.results ?? []).map((r) => r.status));
      const testStatuses = (spec.tests ?? []).map((t) => t.status);
      if (testStatuses.includes("unexpected") || statuses.includes("failed") || statuses.includes("timedOut")) {
        failed.push(spec.title);
      } else if (testStatuses.includes("flaky")) {
        flaky.push(spec.title);
      } else if (statuses.length > 0) {
        passed.push(spec.title);
      }
    }
  };
  for (const suite of data.suites ?? []) walkSuite(suite);
  return { failed, flaky, passed };
}

function snapshotAttempt(scenario, attemptNo, runInfo) {
  const attemptDir = path.join(runsDir, scenario.id, `attempt-${attemptNo}`);
  fs.mkdirSync(attemptDir, { recursive: true });

  const resultsSrc = path.join(root, "artifacts", "results.json");
  let classification = { failed: [], flaky: [], passed: [] };
  if (fs.existsSync(resultsSrc)) {
    fs.copyFileSync(resultsSrc, path.join(attemptDir, "results.json"));
    classification = classifyResults(path.join(attemptDir, "results.json"));
  }

  const testResultsSrc = path.join(root, "test-results");
  if (fs.existsSync(testResultsSrc)) {
    fs.cpSync(testResultsSrc, path.join(attemptDir, "test-results"), { recursive: true });
  }

  fs.writeFileSync(
    path.join(attemptDir, "playwright-output.txt"),
    `$ npx playwright test --retries=${runInfo.retries}\n\n${runInfo.stdout ?? ""}\n${runInfo.stderr ?? ""}`,
  );

  const expectedMet = scenario.expectedFailure
    ? classification.failed.includes(scenario.expectedFailure.testTitle) ||
      classification.flaky.includes(scenario.expectedFailure.testTitle)
    : null;

  const meta = {
    scenarioId: scenario.id,
    class: scenario.class,
    title: scenario.title,
    attempt: attemptNo,
    retries: runInfo.retries,
    exitCode: runInfo.exitCode,
    durationMs: runInfo.durationMs,
    startedAt: runInfo.startedAt,
    changedFiles: scenario.changedFiles ?? [],
    expectedFailure: scenario.expectedFailure,
    expectedFailureMet: expectedMet,
    totals: {
      failed: classification.failed.length,
      flaky: classification.flaky.length,
      passed: classification.passed.length,
    },
  };
  fs.writeFileSync(path.join(attemptDir, "meta.json"), JSON.stringify(meta, null, 2));
  return { ...meta, failed: classification.failed, flaky: classification.flaky };
}

function collectScenario(scenario) {
  const dir = path.join(runsDir, scenario.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "scenario.json"), JSON.stringify(scenario, null, 2));

  const isBaseline = scenario.id === BASELINE.id;
  const attempts = [];
  let applied = false;
  let error = null;

  try {
    if (!isBaseline) {
      const applyResult = sh(`node scripts/scenarios/apply.mjs ${scenario.id} --apply`);
      if (applyResult.status !== 0) {
        throw new Error(`apply failed:\n${applyResult.stderr || applyResult.stdout}`);
      }
      applied = true;
      console.log(`[collect] ${scenario.id}: edits applied`);
    }

    const maxAttempts = scenario.repeat ? args.flakeAttempts : 1;
    for (let n = 1; n <= maxAttempts; n++) {
      killPort(PORT);
      const startedAt = new Date().toISOString();
      const t0 = Date.now();
      const runInfo = sh(`npx playwright test --retries=${args.retries}`);
      runInfo.durationMs = Date.now() - t0;
      runInfo.startedAt = startedAt;
      runInfo.retries = args.retries;
      runInfo.exitCode = runInfo.status;
      const record = snapshotAttempt(scenario, n, runInfo);
      attempts.push(record);
      console.log(
        `[collect] ${scenario.id} attempt ${n}: exit=${runInfo.status} failed=${record.totals.failed} flaky=${record.totals.flaky} passed=${record.totals.passed} expectedMet=${record.expectedFailureMet} (${Math.round(runInfo.durationMs / 1000)}s)`,
      );
      if (!scenario.repeat) break;
      const sawIssue = attempts.some((a) => a.totals.failed > 0 || a.totals.flaky > 0);
      const sawGreen = attempts.some((a) => a.totals.failed === 0 && a.totals.flaky === 0);
      if (sawIssue && sawGreen) break;
    }
  } catch (err) {
    error = String(err && err.message ? err.message : err);
  } finally {
    if (!isBaseline && applied) {
      const revertResult = sh(`node scripts/scenarios/apply.mjs ${scenario.id} --revert`);
      if (revertResult.status !== 0) {
        error = `${error ? error + "\n" : ""}REVERT FAILED:\n${revertResult.stderr || revertResult.stdout}`;
      }
    }
  }

  const check = sh("node scripts/scenarios/apply.mjs --check");
  const summary = {
    id: scenario.id,
    class: scenario.class,
    title: scenario.title,
    attempts: attempts.map((a) => ({
      attempt: a.attempt,
      exitCode: a.exitCode,
      expectedFailureMet: a.expectedFailureMet,
      totals: a.totals,
      failed: a.failed,
      flaky: a.flaky,
      durationMs: a.durationMs,
    })),
    revertedClean: check.status === 0,
    error,
  };
  fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`[collect] ${scenario.id}: done (revertedClean=${summary.revertedClean}${error ? `, ERROR: ${error}` : ""})`);
  return summary;
}

// ── main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(runsDir, { recursive: true });

let scenarios = loadScenarios();
if (args.only) {
  scenarios = scenarios.filter((s) => args.only.includes(s.id));
  if (scenarios.length === 0) {
    console.error(`[collect] no scenarios match --only ${args.only.join(",")}`);
    process.exit(1);
  }
}

const results = [];
results.push(collectScenario(BASELINE));
for (const scenario of scenarios) {
  results.push(collectScenario(scenario));
}

const collectionSummary = {
  startedAt: new Date().toISOString(),
  retries: args.retries,
  flakeAttempts: args.flakeAttempts,
  scenarios: results,
  totals: {
    scenarios: results.length,
    withErrors: results.filter((r) => r.error).length,
    expectedFailureMissed: results.filter(
      (r) => !r.error && r.attempts.length > 0 && r.attempts[0].expectedFailureMet === false,
    ).length,
  },
};
fs.writeFileSync(path.join(runsDir, "collection-summary.json"), JSON.stringify(collectionSummary, null, 2));
console.log("[collect] collection summary written to runs/collection-summary.json");
for (const r of results) {
  const first = r.attempts[0];
  console.log(
    `  ${r.id.padEnd(32)} class=${String(r.class).padEnd(12)} attempts=${r.attempts.length}` +
      ` firstAttempt failed=${first ? first.totals.failed : "-"} flaky=${first ? first.totals.flaky : "-"}` +
      ` expectedMet=${first ? first.expectedFailureMet : "-"}`,
  );
}
