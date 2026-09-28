#!/usr/bin/env node
// Distill a Playwright JSON report into compact triage states for the decision model.
//
// Usage:
//   node scripts/triage/distill.mjs --results <results.json> --out <dir> [options]
//
// Required:
//   --results <path>    Playwright JSON report to read
//   --out <dir>         Directory to write state-NN.json + index.json into
//
// Optional:
//   --changed <a,b,...> Comma-separated changed files, copied to state.changedFiles
//   --scenario <path>   Scenario JSON; its edits become state.diff
//   --specs-dir <dir>   Root for spec lookup (testFile/testSource), default: e2e
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MAX_ERROR_CHARS = 1200;
const MAX_TEST_SOURCE_CHARS = 1500;
const DEFAULT_SPECS_DIR = "e2e";

function parseArgs(argv) {
  const args = { results: null, changed: [], out: null, scenario: null, specsDir: DEFAULT_SPECS_DIR };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (typeof raw !== "string" || !raw.startsWith("--")) continue;
    const eq = raw.indexOf("=");
    const flag = eq === -1 ? raw : raw.slice(0, eq);
    const inline = eq === -1 ? null : raw.slice(eq + 1);
    const value = () => {
      if (inline !== null) return inline;
      if (i + 1 < argv.length) return argv[++i];
      return null;
    };
    if (flag === "--results") args.results = value();
    else if (flag === "--out") args.out = value();
    else if (flag === "--scenario") args.scenario = value();
    else if (flag === "--specs-dir") args.specsDir = value() ?? DEFAULT_SPECS_DIR;
    else if (flag === "--changed") {
      args.changed = (value() ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return args;
}

function stripAnsi(text) {
  return String(text)
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, "")
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u009B[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001B[@-Z\\-_]/g, "");
}

function cleanError(text) {
  if (typeof text !== "string" || text.length === 0) return "";
  const lines = stripAnsi(text).replace(/\r\n?/g, "\n").split("\n");
  const callLogAt = lines.findIndex((line) => /^\s*Call log:/i.test(line));
  if (callLogAt !== -1) lines.length = callLogAt;
  let cleaned = lines
    .filter((line) => !/locator resolved to/i.test(line))
    .join("\n");
  cleaned = cleaned.replace(/(\n[ \t]*){3,}/g, "\n\n").trim();
  if (cleaned.length > MAX_ERROR_CHARS) cleaned = cleaned.slice(0, MAX_ERROR_CHARS);
  return cleaned;
}

function splitEditLines(value) {
  const lines = (typeof value === "string" ? value : "").replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function loadScenarioDiff(scenarioPath) {
  let raw;
  try {
    raw = fs.readFileSync(scenarioPath, "utf8");
  } catch (error) {
    fail(`cannot read scenario file "${scenarioPath}": ${error?.message ?? String(error)}`);
  }
  let scenario;
  try {
    scenario = JSON.parse(raw);
  } catch (error) {
    fail(`invalid JSON in "${scenarioPath}": ${error?.message ?? String(error)}`);
  }
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    fail(`"${scenarioPath}" is not a scenario JSON (expected a JSON object)`);
  }
  const edits = Array.isArray(scenario.edits) ? scenario.edits : [];
  const blocks = [];
  for (const edit of edits) {
    if (!edit || typeof edit !== "object") continue;
    const file = typeof edit.file === "string" ? edit.file : "";
    const lines = [`--- ${file}`];
    for (const line of splitEditLines(edit.find)) lines.push(`- ${line}`);
    for (const line of splitEditLines(edit.replace)) lines.push(`+ ${line}`);
    blocks.push(lines.join("\n"));
  }
  return blocks.length > 0 ? blocks.join("\n\n") : null;
}

function findSpecFile(specsDir, specBasename) {
  const stack = [specsDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name === specBasename) return full;
    }
  }
  return null;
}

function extractTestSource(sourceLines, title) {
  if (typeof title !== "string" || !title) return null;
  const marker = `test(${JSON.stringify(title)}`;
  const start = sourceLines.findIndex((line) => line.includes(marker));
  if (start === -1) return null;
  for (let i = start; i < sourceLines.length; i++) {
    if (sourceLines[i].trim() === "});") {
      return sourceLines.slice(start, i + 1).join("\n").slice(0, MAX_TEST_SOURCE_CHARS);
    }
  }
  return null;
}

function resolveTestContext(specFile, testTitle, specsDir) {
  if (!specsDir || typeof specFile !== "string" || !specFile) return {};
  let specPath = null;
  try {
    specPath = findSpecFile(specsDir, path.basename(specFile));
  } catch {
    specPath = null;
  }
  if (!specPath) return {};
  const context = {
    testFile: path.relative(process.cwd(), specPath).split(path.sep).join("/"),
  };
  try {
    const source = fs.readFileSync(specPath, "utf8").replace(/\r\n?/g, "\n");
    const block = extractTestSource(source.split("\n"), testTitle);
    if (block) context.testSource = block;
  } catch {
    // testFile only; caller marks testSourceMissing
  }
  return context;
}

function isFailureStatus(status) {
  return status === "failed" || status === "timedOut" || status === "interrupted";
}

function inferStatus(test) {
  const results = Array.isArray(test?.results) ? test.results : [];
  const statuses = results.map((r) => (r && typeof r.status === "string" ? r.status : ""));
  const failed = statuses.some(isFailureStatus);
  const passed = statuses.some((s) => s === "passed");
  if (failed && passed) return "flaky";
  if (failed) return "unexpected";
  return null;
}

function pickBadTest(tests) {
  let flaky = null;
  for (const test of tests) {
    if (!test || typeof test !== "object") continue;
    const status = test.status === "unexpected" || test.status === "flaky" ? test.status : inferStatus(test);
    if (!status) continue;
    if (status === "unexpected") return { test, status };
    if (!flaky) flaky = { test, status };
  }
  return flaky;
}

function collectFailureEntries(report) {
  const entries = [];
  const visit = (suite, inheritedFile) => {
    if (!suite || typeof suite !== "object") return;
    const suiteFile = typeof suite.file === "string" && suite.file ? suite.file : inheritedFile;
    for (const child of Array.isArray(suite.suites) ? suite.suites : []) visit(child, suiteFile);
    for (const spec of Array.isArray(suite.specs) ? suite.specs : []) {
      if (!spec || typeof spec !== "object") continue;
      const picked = pickBadTest(Array.isArray(spec.tests) ? spec.tests : []);
      if (!picked) continue;
      entries.push({ spec, test: picked.test, status: picked.status, suiteFile });
    }
  };
  for (const suite of Array.isArray(report.suites) ? report.suites : []) visit(suite, null);
  return entries;
}

function findLastFailure(results) {
  for (let i = results.length - 1; i >= 0; i--) {
    if (isFailureStatus(results[i]?.status)) return results[i];
  }
  return null;
}

function describeResults(results) {
  if (results.length === 0) return "no results recorded";
  return results
    .map((result, i) => {
      const status = typeof result?.status === "string" && result.status ? result.status : "unknown";
      const label = i === 0 ? "attempt 1" : i === 1 ? "retry" : `retry ${i}`;
      const ms = Number(result?.duration);
      return Number.isFinite(ms) ? `${label} ${status} (${(ms / 1000).toFixed(1)}s)` : `${label} ${status}`;
    })
    .join("; ");
}

function collectErrorMessages(result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const messages = errors
    .map((error) => (error && typeof error.message === "string" ? error.message : ""))
    .filter((message) => message.length > 0);
  return cleanError(messages.join("\n\n"));
}

function normalizeAttachments(result) {
  const attachments = Array.isArray(result?.attachments) ? result.attachments : [];
  return attachments.map((attachment) => {
    const name =
      (typeof attachment?.name === "string" && attachment.name) ||
      (typeof attachment?.contentType === "string" && attachment.contentType) ||
      "attachment";
    const item = { name };
    if (typeof attachment?.path === "string" && attachment.path) item.path = attachment.path;
    return item;
  });
}

function toDurationMs(result) {
  const ms = Number(result?.duration);
  return Number.isFinite(ms) ? Math.round(ms) : 0;
}

function buildState(entry, changedFiles, options) {
  const { spec, test, status, suiteFile } = entry;
  const results = (Array.isArray(test.results) ? test.results : []).filter((r) => r && typeof r === "object");
  const chosen =
    status === "flaky"
      ? findLastFailure(results) ?? results[results.length - 1] ?? null
      : results[results.length - 1] ?? null;

  const state = {
    test: typeof spec.title === "string" && spec.title ? spec.title : "(untitled spec)",
  };

  const specFile = (typeof spec.file === "string" && spec.file) || suiteFile;
  if (specFile) state.spec = specFile;

  const testContext = resolveTestContext(specFile, state.test, options.specsDir);
  if (testContext.testFile) state.testFile = testContext.testFile;
  if (testContext.testSource) state.testSource = testContext.testSource;
  else if (testContext.testFile) state.testSourceMissing = true;

  const project =
    (typeof test.projectName === "string" && test.projectName) ||
    (typeof test.projectId === "string" && test.projectId) ||
    null;
  if (project) state.project = project;

  state.status = status;
  state.retry = describeResults(results);
  state.error = chosen ? collectErrorMessages(chosen) : "";
  if (options.diff) state.diff = options.diff;
  state.attachments = normalizeAttachments(chosen);
  state.changedFiles = [...changedFiles];
  state.durationMs = toDurationMs(chosen);
  return state;
}

function fail(message) {
  console.error(`distill: ${message}`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.results) fail("missing required --results <path>");
  if (!args.out) fail("missing required --out <dir>");

  const diff = args.scenario ? loadScenarioDiff(args.scenario) : null;

  let raw;
  try {
    raw = fs.readFileSync(args.results, "utf8");
  } catch (error) {
    fail(`cannot read results file "${args.results}": ${error?.message ?? String(error)}`);
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch (error) {
    fail(`invalid JSON in "${args.results}": ${error?.message ?? String(error)}`);
  }

  if (!report || typeof report !== "object" || Array.isArray(report)) {
    fail(`"${args.results}" is not a Playwright JSON report (expected a JSON object)`);
  }

  const entries = collectFailureEntries(report);

  try {
    fs.mkdirSync(args.out, { recursive: true });
  } catch (error) {
    fail(`cannot create --out directory "${args.out}": ${error?.message ?? String(error)}`);
  }

  const states = [];
  try {
    entries.forEach((entry, i) => {
      const state = buildState(entry, args.changed, { diff, specsDir: args.specsDir });
      const file = `state-${String(i + 1).padStart(2, "0")}.json`;
      fs.writeFileSync(path.join(args.out, file), `${JSON.stringify(state, null, 2)}\n`);
      const indexEntry = { file, test: state.test };
      if (state.spec !== undefined) indexEntry.spec = state.spec;
      indexEntry.status = state.status;
      states.push(indexEntry);
    });

    const index = {
      generatedAt: new Date().toISOString(),
      source: args.results,
      count: states.length,
      states,
    };
    fs.writeFileSync(path.join(args.out, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  } catch (error) {
    fail(`failed writing states to "${args.out}": ${error?.message ?? String(error)}`);
  }

  console.log(
    `distill: ${states.length} state${states.length === 1 ? "" : "s"} written to ${args.out} (source: ${args.results})`,
  );
  for (const state of states) {
    console.log(`  ${state.file}  ${state.status.padEnd(10)} ${state.test}`);
  }
  if (states.length === 0) console.log("  (no unexpected or flaky specs)");
}

main();
