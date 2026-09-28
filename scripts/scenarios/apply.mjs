#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

if (!import.meta.dirname) {
  console.error("error: this CLI requires Node.js 20.11+ (import.meta.dirname)");
  process.exit(1);
}

const ROOT = resolve(import.meta.dirname, "..", "..");
const SCENARIOS_DIR = join(ROOT, "scenarios");
const MANIFEST_NAME = "manifest.json";
const VALID_CLASSES = new Set(["product", "test", "flake", "environment"]);

function die(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function countOccurrences(haystack, needle) {
  if (typeof needle !== "string" || needle.length === 0) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function readText(relPath, what) {
  const fullPath = join(ROOT, relPath);
  if (!existsSync(fullPath)) die(`${what} not found: ${relPath}`);
  try {
    return readFileSync(fullPath, "utf8");
  } catch (error) {
    die(`cannot read ${relPath}: ${error.message}`);
  }
}

function parseJson(relPath, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    die(`cannot parse ${relPath}: ${error.message}`);
  }
}

function loadScenarios() {
  const manifestText = readText(`scenarios/${MANIFEST_NAME}`, "manifest");
  const manifest = parseJson(`scenarios/${MANIFEST_NAME}`, manifestText);
  const entries = Array.isArray(manifest.scenarios) ? manifest.scenarios : [];
  if (entries.length === 0) die(`scenarios/${MANIFEST_NAME} lists no scenarios`);

  const scenarios = entries.map((entry) => {
    const relPath =
      typeof entry.file === "string" && entry.file.length > 0
        ? entry.file.replace(/\\/g, "/")
        : `scenarios/${entry.id}.json`;
    const scenario = parseJson(relPath, readText(relPath, "scenario file"));
    if (scenario.id !== entry.id) {
      die(`${relPath} declares id "${scenario.id}" but ${MANIFEST_NAME} lists "${entry.id}"`);
    }
    scenario.__path = relPath;
    return scenario;
  });

  const listed = new Set(scenarios.map((scenario) => scenario.__path));
  const onDisk = readdirSync(SCENARIOS_DIR)
    .filter((name) => name.endsWith(".json") && name !== MANIFEST_NAME)
    .map((name) => `scenarios/${name}`);
  const unlisted = onDisk.filter((name) => !listed.has(name));
  if (unlisted.length > 0) {
    die(`scenario file(s) not listed in ${MANIFEST_NAME}: ${unlisted.join(", ")}`);
  }
  return scenarios;
}

function validateShape(scenario) {
  const problems = [];
  if (typeof scenario.id !== "string" || scenario.id.length === 0) problems.push("id must be a non-empty string");
  if (!VALID_CLASSES.has(scenario.class)) problems.push(`class must be one of: ${[...VALID_CLASSES].join(", ")}`);
  if (typeof scenario.title !== "string" || scenario.title.length === 0) problems.push("title must be a non-empty string");
  if (typeof scenario.summary !== "string" || scenario.summary.length === 0) problems.push("summary must be a non-empty string");
  if (!Array.isArray(scenario.edits) || scenario.edits.length === 0) {
    problems.push("edits must be a non-empty array");
  } else {
    scenario.edits.forEach((edit, index) => {
      const label = `edit ${index + 1}`;
      if (!edit || typeof edit !== "object") {
        problems.push(`${label}: must be an object`);
        return;
      }
      if (typeof edit.file !== "string" || edit.file.length === 0) problems.push(`${label}: file must be a non-empty string`);
      if (typeof edit.find !== "string" || edit.find.length === 0) problems.push(`${label}: find must be a non-empty string`);
      if (typeof edit.replace !== "string" || edit.replace.length === 0) problems.push(`${label}: replace must be a non-empty string`);
    });
  }
  const expected = scenario.expectedFailure;
  if (!expected || typeof expected.spec !== "string" || !expected.spec || typeof expected.testTitle !== "string" || !expected.testTitle) {
    problems.push("expectedFailure.spec and expectedFailure.testTitle must be non-empty strings");
  }
  if ("repeat" in scenario && scenario.repeat !== true) problems.push("repeat, when present, must be true");
  if (scenario.repeat === true && scenario.class !== "flake") problems.push("repeat is only allowed on the flake scenario");
  return problems;
}

function loadAllScenarios() {
  const scenarios = loadScenarios();
  for (const scenario of scenarios) {
    const problems = validateShape(scenario);
    if (problems.length > 0) {
      die(`${scenario.__path ?? scenario.id} is invalid:\n  - ${problems.join("\n  - ")}`);
    }
  }
  return scenarios;
}

function readEditFiles(scenario, errors) {
  const contents = new Map();
  scenario.edits.forEach((edit, index) => {
    const label = `edit ${index + 1} (${edit.file})`;
    if (contents.has(edit.file)) return;
    const fullPath = join(ROOT, edit.file);
    if (!existsSync(fullPath)) {
      errors.push(`${label}: file not found: ${edit.file}`);
      return;
    }
    try {
      contents.set(edit.file, readFileSync(fullPath, "utf8"));
    } catch (error) {
      errors.push(`${label}: cannot read file: ${error.message}`);
    }
  });
  return contents;
}

function validateForApply(scenario) {
  const errors = [];
  const contents = readEditFiles(scenario, errors);
  scenario.edits.forEach((edit, index) => {
    const label = `edit ${index + 1} (${edit.file})`;
    const content = contents.get(edit.file);
    if (content === undefined) return;
    const findCount = countOccurrences(content, edit.find);
    const replaceCount = countOccurrences(content, edit.replace);
    if (findCount !== 1) errors.push(`${label}: "find" occurs ${findCount} time(s) in the current file, expected exactly 1`);
    if (replaceCount !== 0) errors.push(`${label}: "replace" already occurs ${replaceCount} time(s) in the current file, expected 0`);
  });
  return errors;
}

function validateForRevert(scenario) {
  const errors = [];
  const contents = readEditFiles(scenario, errors);
  scenario.edits.forEach((edit, index) => {
    const label = `edit ${index + 1} (${edit.file})`;
    const content = contents.get(edit.file);
    if (content === undefined) return;
    const replaceCount = countOccurrences(content, edit.replace);
    const findCount = countOccurrences(content, edit.find);
    if (replaceCount !== 1) {
      errors.push(`${label}: "replace" occurs ${replaceCount} time(s) in the current file, expected exactly 1 (is the scenario applied?)`);
    }
    if (findCount !== 0) {
      errors.push(`${label}: "find" still occurs ${findCount} time(s) in the current file, expected 0 after mutation`);
    }
  });
  return errors;
}

function listScenarios(scenarios) {
  const idWidth = Math.max("ID".length, ...scenarios.map((scenario) => scenario.id.length));
  const classWidth = Math.max("CLASS".length, ...scenarios.map((scenario) => scenario.class.length));
  console.log(`${"ID".padEnd(idWidth)}  ${"CLASS".padEnd(classWidth)}`);
  console.log(`${"-".repeat(idWidth)}  ${"-".repeat(classWidth)}`);
  for (const scenario of scenarios) {
    console.log(`${scenario.id.padEnd(idWidth)}  ${scenario.class.padEnd(classWidth)}`);
  }
  console.log(`\n${scenarios.length} scenario(s)`);
}

function checkScenarios(scenarios) {
  let failed = 0;
  for (const scenario of scenarios) {
    const errors = validateForApply(scenario);
    if (errors.length === 0) {
      const count = scenario.edits.length;
      console.log(`OK   ${scenario.id} (${count} edit${count === 1 ? "" : "s"})`);
    } else {
      failed += 1;
      console.log(`FAIL ${scenario.id}`);
      for (const error of errors) console.log(`     - ${error}`);
    }
  }
  console.log("");
  console.log(`${scenarios.length} scenario(s) checked: ${scenarios.length - failed} OK, ${failed} FAIL`);
  if (failed > 0) process.exitCode = 1;
}

function runScenario(scenarios, id, mode) {
  const scenario = scenarios.find((candidate) => candidate.id === id);
  if (!scenario) die(`unknown scenario "${id}" (run with --list to see ids)`);
  const revert = mode === "revert";
  const errors = revert ? validateForRevert(scenario) : validateForApply(scenario);
  if (errors.length > 0) {
    console.error(`${mode} "${scenario.id}" failed validation; no files were written:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const pending = new Map();
  for (const edit of scenario.edits) {
    const current = pending.has(edit.file)
      ? pending.get(edit.file)
      : readFileSync(join(ROOT, edit.file), "utf8");
    const from = revert ? edit.replace : edit.find;
    const to = revert ? edit.find : edit.replace;
    const index = current.indexOf(from);
    pending.set(edit.file, current.slice(0, index) + to + current.slice(index + from.length));
  }
  for (const [file, content] of pending) {
    writeFileSync(join(ROOT, file), content, "utf8");
    console.log(`${revert ? "reverted" : "applied"} ${file}`);
  }
  const count = scenario.edits.length;
  console.log(`${mode} "${scenario.id}": ${count} edit${count === 1 ? "" : "s"} ${revert ? "reverted" : "applied"}`);
}

function usage() {
  console.log(`Usage:
  node scripts/scenarios/apply.mjs --list
  node scripts/scenarios/apply.mjs --check
  node scripts/scenarios/apply.mjs <scenario-id> --apply
  node scripts/scenarios/apply.mjs <scenario-id> --revert`);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const positionals = args.filter((arg) => !arg.startsWith("--"));

if (flags.has("--list") && positionals.length === 0 && flags.size === 1) {
  listScenarios(loadAllScenarios());
} else if (flags.has("--check") && positionals.length === 0 && flags.size === 1) {
  checkScenarios(loadAllScenarios());
} else if (
  positionals.length === 1 &&
  flags.size === 1 &&
  (flags.has("--apply") || flags.has("--revert"))
) {
  runScenario(loadAllScenarios(), positionals[0], flags.has("--apply") ? "apply" : "revert");
} else {
  usage();
  process.exitCode = 1;
}
