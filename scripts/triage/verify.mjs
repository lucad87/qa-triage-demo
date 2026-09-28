#!/usr/bin/env node
// QA triage — candidate verifier.
//
// Verifies a candidate fixed spec (e.g. runs/<id>/actions/<state>-spec.candidate.ts)
// by swapping it into the real spec file, re-running the failing test with
// Playwright, then restoring everything.
//
// The restore/revert phase always runs, no matter how the Playwright run ended,
// and the process exits with Playwright's exit code only after the tree is back
// to its pre-run state. Exit code 2 means a restore/revert step failed.
//
// Usage:
//   node scripts/triage/verify.mjs --candidate <file.ts> --spec e2e/tasks.spec.ts \
//     --grep "<test title>" [--scenario <id>] [--out <result.json>]

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const applyScript = path.join(root, "scripts", "scenarios", "apply.mjs");
const TAIL_LIMIT = 4000;

const USAGE =
  'usage: node scripts/triage/verify.mjs --candidate <file.ts> --spec e2e/tasks.spec.ts --grep "<test title>" [--scenario <id>] [--out <result.json>]';

class CliError extends Error {}

function parseArgs(argv) {
  const args = { candidate: null, spec: null, grep: null, scenario: null, out: null, help: false };
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
      case "--candidate":
        args.candidate = takeValue();
        break;
      case "--spec":
        args.spec = takeValue();
        break;
      case "--grep":
        args.grep = takeValue();
        break;
      case "--scenario":
        args.scenario = takeValue();
        break;
      case "--out":
        args.out = takeValue();
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

const resolveFromRoot = (value) => path.resolve(root, value);

function sh(cmd) {
  return spawnSync(cmd, { shell: true, cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
}

function tail(text) {
  if (typeof text !== "string") return "";
  return text.length > TAIL_LIMIT ? text.slice(-TAIL_LIMIT) : text;
}

function quote(value) {
  const text = String(value);
  if (process.platform === "win32") return `"${text.replace(/"/g, '\\"')}"`;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    if (err instanceof CliError) {
      console.error(`[verify] ${err.message}`);
      console.error(USAGE);
      return 1;
    }
    throw err;
  }
  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  const missing = ["candidate", "spec", "grep"].filter((key) => !args[key]);
  if (missing.length > 0) {
    console.error(`[verify] missing required option(s): ${missing.map((key) => `--${key}`).join(", ")}`);
    console.error(USAGE);
    return 1;
  }

  const candidatePath = resolveFromRoot(args.candidate);
  const specPath = resolveFromRoot(args.spec);
  const outPath = args.out ? resolveFromRoot(args.out) : `${candidatePath}.verify.json`;
  const scenario = args.scenario || null;

  for (const [what, file] of [["candidate", candidatePath], ["spec", specPath]]) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      console.error(`[verify] ${what} not found: ${file}`);
      return 1;
    }
  }

  let specBackup;
  let candidateContent;
  try {
    specBackup = fs.readFileSync(specPath);
    candidateContent = fs.readFileSync(candidatePath);
  } catch (err) {
    console.error(`[verify] cannot read inputs: ${err.message}`);
    return 1;
  }

  if (scenario) {
    const apply = sh(`node scripts/scenarios/apply.mjs ${quote(scenario)} --apply`);
    if (apply.status !== 0) {
      process.stdout.write(apply.stdout ?? "");
      process.stderr.write(apply.stderr ?? "");
      console.error(`[verify] scenario apply failed: ${scenario} (exit ${apply.status}) — nothing was swapped`);
      return 1;
    }
  }

  let exitCode = 1;
  let durationMs = 0;
  let stdoutTail = "";
  let stderrTail = "";
  let swapError = null;

  try {
    fs.writeFileSync(specPath, candidateContent);
    const startedAt = Date.now();
    const run = sh(`npx playwright test --grep ${quote(args.grep)} --retries=0`);
    durationMs = Date.now() - startedAt;
    exitCode = typeof run.status === "number" ? run.status : 1;
    stdoutTail = tail(run.stdout);
    stderrTail = tail(run.stderr);
    if (run.error) {
      stderrTail = tail(`${stderrTail ? `${stderrTail}\n` : ""}[verify] playwright spawn error: ${run.error.message}`);
    }
  } catch (err) {
    swapError = err.message;
    stderrTail = tail(`[verify] could not swap candidate into ${args.spec}: ${err.message}`);
  }

  let restoredSpec = false;
  let restoreError = null;
  try {
    fs.writeFileSync(specPath, specBackup);
    restoredSpec = fs.readFileSync(specPath).equals(specBackup);
    if (!restoredSpec) restoreError = `${args.spec} differs from the backup after restore`;
  } catch (err) {
    restoreError = `cannot restore ${args.spec}: ${err.message}`;
  }

  let revertedScenario = null;
  let revertError = null;
  if (scenario) {
    const revert = sh(`node scripts/scenarios/apply.mjs ${quote(scenario)} --revert`);
    revertedScenario = revert.status === 0;
    if (!revertedScenario) {
      revertError = `scenario revert failed: ${scenario} (exit ${revert.status})`;
      if (revert.stderr) revertError += `\n${revert.stderr.trim()}`;
    }
  }

  let treeClean = null;
  if (fs.existsSync(applyScript)) {
    const check = sh("node scripts/scenarios/apply.mjs --check");
    treeClean = check.status === 0;
  }

  const result = {
    candidate: args.candidate,
    spec: args.spec,
    grep: args.grep,
    scenario,
    exitCode,
    passed: exitCode === 0,
    durationMs,
    stdoutTail,
    stderrTail,
    restoredSpec,
    revertedScenario,
    treeClean,
    generatedAt: new Date().toISOString(),
  };

  let resultError = null;
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
  } catch (err) {
    resultError = `cannot write result file ${outPath}: ${err.message}`;
  }

  console.log(`verify: ${result.passed ? "PASS" : "FAIL"} — ${args.grep} (scenario=${scenario ?? "none"})`);

  const failures = [];
  if (restoreError) failures.push(restoreError);
  if (revertedScenario === false) failures.push(revertError);
  if (treeClean === false) failures.push("tree check reports an unclean working tree (node scripts/scenarios/apply.mjs --check)");
  if (swapError) failures.push(`candidate swap failed: ${swapError}`);
  if (resultError) failures.push(resultError);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[verify] ${failure}`);
    console.error("[verify] exiting 2 — restore/revert did not complete cleanly");
    return 2;
  }
  return exitCode;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(`[verify] error: ${err?.message ?? err}`);
  process.exitCode = 1;
}
