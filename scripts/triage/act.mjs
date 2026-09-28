#!/usr/bin/env node
// QA triage — action layer.
//
// Consumes one pipeline run directory:
//   <run>/states/*.json   distilled failure states (distill.mjs)
//   <run>/decisions.json  routing decisions (decide.mjs)
// and turns each routed decision into a concrete artifact:
//   flake-tracker  -> <out>/flakes.jsonl                                (no LLM)
//   env-alert      -> <out>/env-alerts.md                               (no LLM)
//   test-fix       -> <out>/<state>-spec.candidate.ts + -rationale.md   (DeepSeek)
//   product-report -> <out>/<state>-product-report.md                   (DeepSeek)
//   escalate       -> <out>/<state>-triage.json (DeepSeek deep triage), then the
//                     matching generation path above (possibly a second LLM call).
//
// Usage:
//   node scripts/triage/act.mjs --run <runs/<id>> [--out <runs/<id>/actions>] [--dry-run] [--model deepseek-chat]
//
// --dry-run performs no network calls: every prompt that would be sent is
// rendered to <out>/prompts/<state>-<kind>.md, and the LLM-free artifacts
// (flakes.jsonl, env-alerts.md, manifest.json) are still written.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USAGE =
  "usage: node scripts/triage/act.mjs --run <runs/<id>> [--out <runs/<id>/actions>] [--dry-run] [--model deepseek-chat]";
const DEFAULT_MODEL = "deepseek-chat";
const API_URL = "https://api.deepseek.com/chat/completions";
const TIMEOUT_MS = 300_000;
const MAX_TOKENS = 4096;
const ORIGINS = ["test", "product", "flake", "environment"];
const ERROR_EXCERPT_CHARS = 400;
const KEY_ENV_VARS = ["DEEPSEEK_API_KEY", "LPR_AMXVA_DEEPSEEK_API_KEY"];

class CliError extends Error {}

function parseArgs(argv) {
  const args = { run: null, out: null, dryRun: false, model: DEFAULT_MODEL, help: false };
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
      case "--run":
        args.run = takeValue();
        break;
      case "--out":
        args.out = takeValue();
        break;
      case "--model":
        args.model = takeValue();
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        throw new CliError(`unknown argument "${raw}"`);
    }
  }
  if (!args.help && !args.run) throw new CliError("--run <runs/<id>> is required");
  return args;
}

function resolveApiKey() {
  for (const name of KEY_ENV_VARS) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return { key: value.trim(), name };
  }
  return null;
}

function loadDecisions(runDir) {
  const file = path.join(runDir, "decisions.json");
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (err) {
    throw new Error(`cannot read "${file}": ${err.message}`);
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    throw new Error(`cannot parse "${file}": ${err.message}`);
  }
  if (doc === null || typeof doc !== "object" || !Array.isArray(doc.decisions)) {
    throw new Error(`"${file}" is not a decide.mjs output (expected an object with a "decisions" array)`);
  }
  return doc.decisions;
}

function loadStates(dir) {
  const states = new Map();
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`cannot read states directory "${dir}": ${err.message}`);
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!name.toLowerCase().endsWith(".json") || name.toLowerCase() === "index.json") continue;
    try {
      const doc = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
        states.set(name, { file: name, error: `state "${name}" is not a JSON object` });
        continue;
      }
      states.set(name, { file: name, state: doc });
    } catch (err) {
      states.set(name, { file: name, error: `cannot parse state "${name}": ${err.message}` });
    }
  }
  return states;
}

function findState(states, name) {
  if (states.has(name)) return states.get(name);
  const lower = name.toLowerCase();
  for (const [key, value] of states) {
    if (key.toLowerCase() === lower) return value;
  }
  return null;
}

function resolveSpec(spec) {
  if (typeof spec !== "string" || !spec.trim()) return null;
  const base = path.basename(spec.trim());
  const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const roots = [path.join(process.cwd(), "e2e"), path.join(scriptRoot, "e2e")];
  for (const root of roots) {
    const candidate = path.join(root, base);
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // keep looking in the next root
    }
  }
  return null;
}

function stateExcerpt(text) {
  if (typeof text !== "string") return "";
  const flat = text.replace(/\r\n?/g, "\n").trim();
  if (flat.length <= ERROR_EXCERPT_CHARS) return flat;
  return `${flat.slice(0, ERROR_EXCERPT_CHARS)}…`;
}

function ensureNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function extractTag(text, tag) {
  const match = text.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

function parseTriage(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let doc;
  try {
    doc = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (doc === null || typeof doc !== "object" || !ORIGINS.includes(doc.origin)) return null;
  return {
    origin: doc.origin,
    rationale: typeof doc.rationale === "string" ? doc.rationale : "",
    recommendedAction: typeof doc.recommendedAction === "string" ? doc.recommendedAction : "",
  };
}

function buildTestFixPrompt(state, target, specContent) {
  const system = [
    'You are a senior test engineer maintaining the Playwright suite of the "TaskDeck" demo app (a small Next.js task board).',
    'The triage pipeline routed this failure to "test-fix": the most likely origin is the test itself — selector drift, a stale assertion, wrong fixture data, or a missing wait — not the product under test.',
    "",
    "Rules:",
    "- Preserve the test's intent and coverage. Do not delete tests and do not weaken assertions just to make them pass.",
    "- If you conclude the product is actually at fault, do not mask it: keep the test honest and explain the conflict in the rationale.",
    "- Only edit the spec file you are given; do not invent new helpers, fixtures, or dependencies.",
  ].join("\n");
  const user = [
    "## Failure state",
    "",
    "```json",
    JSON.stringify(state, null, 2),
    "```",
    "",
    `## Current spec file: ${target}`,
    "",
    "```ts",
    specContent ?? "(file content unavailable — the spec could not be resolved under e2e/)",
    "```",
    "",
    "## Task",
    "",
    "Rewrite the spec so it passes against the current app while preserving its intent. Return the complete updated file, not a diff.",
    "",
    "## Output contract",
    "",
    "Respond with exactly these two sections, in this order, and nothing else:",
    "",
    "<updated_file>",
    "... the complete updated spec file ...",
    "</updated_file>",
    "",
    "<rationale>",
    "... a short rationale: what was stale, what you changed, and any remaining risk ...",
    "</rationale>",
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function buildProductReportPrompt(state) {
  const system = [
    "You are a QA engineer writing a product bug report from a failing Playwright test.",
    'The triage pipeline routed this failure to "product-report": the most likely origin is a genuine regression in the app under test that the test correctly detects.',
    "",
    "Be factual and concise. Do not invent reproduction steps, users, or evidence the failure state does not support. If the state is ambiguous, say so.",
  ].join("\n");
  const user = [
    "## Failure state",
    "",
    "```json",
    JSON.stringify(state, null, 2),
    "```",
    "",
    "## Task",
    "",
    "Write a product bug report in Markdown with exactly these sections:",
    "",
    "# <Title>",
    "## Severity",
    "## Summary",
    "## Reproduction",
    "## Evidence",
    "## Why this is a product bug",
    "## Suggested next step",
    "",
    "Requirements:",
    "- Evidence must quote the error excerpt from the failure state inside a fenced code block.",
    "- Reproduction must be a short numbered list derived from the failing test in the state.",
    "- Suggested next step must name the most likely code area to inspect, using changedFiles when available.",
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function buildDeepTriagePrompt(state, decision) {
  const system = [
    "You are the deep-triage fallback of a Playwright failure pipeline.",
    "The decision layer escalated this failure because its routing confidence stayed below the fitted thresholds, so this call has to make the harder call.",
    "",
    "Classify the origin as exactly one of:",
    '- "test": the test is wrong or outdated (selector drift, stale assertion, wrong fixture data, missing wait)',
    '- "product": the app is broken — a real regression the test correctly detects',
    '- "flake": timing or randomness — the same test passes on retry with no code change',
    '- "environment": test environment, browser, ports, or infrastructure misconfiguration',
  ].join("\n");
  const escalationRecord = {
    route: decision?.route ?? "escalate",
    reasons: Array.isArray(decision?.reasons) ? decision.reasons : [],
    answers: decision?.answers ?? null,
  };
  const user = [
    "## Failure state",
    "",
    "```json",
    JSON.stringify(state, null, 2),
    "```",
    "",
    "## Escalation record",
    "",
    "```json",
    JSON.stringify(escalationRecord, null, 2),
    "```",
    "",
    "## Task",
    "",
    "Classify the most likely origin of this failure and recommend the concrete next action.",
    "",
    "## Output contract",
    "",
    "Respond with a single JSON object and no prose around it:",
    "",
    "{",
    '  "origin": "test" | "product" | "flake" | "environment",',
    '  "rationale": "why this origin, citing the state",',
    '  "recommendedAction": "the concrete next step"',
    "}",
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function writePrompt(outDir, stateBase, kind, model, target, messages) {
  const dir = path.join(outDir, "prompts");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${stateBase}-${kind}.md`);
  const header = [`# ${kind} prompt`, "", `- model: ${model}`, `- target: ${target}`, ""].join("\n");
  const body = messages.map((message) => `## ${message.role}\n\n${message.content}\n`).join("\n");
  fs.writeFileSync(file, `${header}\n${body}\n`);
  return path.relative(outDir, file).split(path.sep).join("/");
}

function appendArtifact(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    if (fs.statSync(file).size > 0 && !fs.readFileSync(file, "utf8").endsWith("\n")) text = `\n${text}`;
  } catch {
    // the artifact does not exist yet — nothing to separate from
  }
  fs.appendFileSync(file, text);
}

function appendFlake(outDir, record, state) {
  const line = JSON.stringify({
    state: record.state,
    test: typeof state.test === "string" ? state.test : record.test,
    retry: typeof state.retry === "string" ? state.retry : "",
    changedFiles: Array.isArray(state.changedFiles) ? state.changedFiles : [],
  });
  appendArtifact(path.join(outDir, "flakes.jsonl"), `${line}\n`);
  record.artifacts.push("flakes.jsonl");
}

function appendEnvAlert(outDir, record, state) {
  const title = (typeof state.test === "string" && state.test) || record.test || "(untitled spec)";
  const section = [
    `## ${title}`,
    "",
    `- state: ${record.state}`,
    "",
    "```",
    stateExcerpt(state.error) || "(no error excerpt recorded in the state)",
    "```",
    "",
  ].join("\n");
  appendArtifact(path.join(outDir, "env-alerts.md"), `${section}\n`);
  record.artifacts.push("env-alerts.md");
}

async function callDeepSeek(apiKey, model, messages) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: MAX_TOKENS, temperature: 0.2 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(`DeepSeek request failed: ${err?.message ?? err}`);
  }
  const text = await response.text();
  if (!response.ok) {
    const body = text.replace(/\s+/g, " ").trim().slice(0, 300);
    throw new Error(`DeepSeek API error: HTTP ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`DeepSeek returned invalid JSON: ${text.slice(0, 200)}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("DeepSeek response is missing choices[0].message.content");
  }
  return content;
}

async function runTestFix(ctx, record, state, stateBase) {
  const specPath = resolveSpec(state.spec);
  const specContent = specPath ? fs.readFileSync(specPath, "utf8") : null;
  const target = specPath ?? `(unresolved: ${typeof state.spec === "string" && state.spec ? state.spec : "no spec field"})`;
  if (specPath) record.notes.push(`resolved spec: ${specPath}`);
  else record.notes.push(`could not resolve spec "${state.spec ?? "(missing)"}" under e2e/`);

  const messages = buildTestFixPrompt(state, target, specContent);
  if (ctx.dryRun) {
    record.artifacts.push(writePrompt(ctx.outDir, stateBase, "test-fix", ctx.model, target, messages));
    return;
  }

  const content = await callDeepSeek(ctx.apiKey, ctx.model, messages);
  record.llm = true;
  const updated = extractTag(content, "updated_file");
  const rationale = extractTag(content, "rationale");
  if (updated === null || rationale === null) {
    const rawName = `${stateBase}-spec.raw.md`;
    fs.writeFileSync(path.join(ctx.outDir, rawName), ensureNewline(content));
    record.artifacts.push(rawName);
    record.errors.push("test-fix response did not contain both <updated_file> and <rationale> tags; raw response saved");
    return;
  }
  const candidateName = `${stateBase}-spec.candidate.ts`;
  const rationaleName = `${stateBase}-rationale.md`;
  fs.writeFileSync(path.join(ctx.outDir, candidateName), ensureNewline(updated));
  fs.writeFileSync(path.join(ctx.outDir, rationaleName), ensureNewline(rationale));
  record.artifacts.push(candidateName, rationaleName);
}

async function runProductReport(ctx, record, state, stateBase) {
  const title = (typeof state.test === "string" && state.test) || record.test || "(untitled spec)";
  const target = `product bug report for "${title}"`;
  const messages = buildProductReportPrompt(state);
  if (ctx.dryRun) {
    record.artifacts.push(writePrompt(ctx.outDir, stateBase, "product-report", ctx.model, target, messages));
    return;
  }

  const content = await callDeepSeek(ctx.apiKey, ctx.model, messages);
  record.llm = true;
  const name = `${stateBase}-product-report.md`;
  fs.writeFileSync(path.join(ctx.outDir, name), ensureNewline(content));
  record.artifacts.push(name);
}

async function runEscalate(ctx, record, state, stateBase, decision) {
  const title = (typeof state.test === "string" && state.test) || record.test || "(untitled spec)";
  const target = `deep triage for "${title}"`;
  const messages = buildDeepTriagePrompt(state, decision);
  if (ctx.dryRun) {
    record.artifacts.push(writePrompt(ctx.outDir, stateBase, "deep-triage", ctx.model, target, messages));
    record.notes.push("dry-run: the follow-up generation path depends on the deep-triage origin and is not rendered");
    return;
  }

  const content = await callDeepSeek(ctx.apiKey, ctx.model, messages);
  record.llm = true;
  const triage = parseTriage(content);
  if (!triage) {
    const rawName = `${stateBase}-triage.raw.md`;
    fs.writeFileSync(path.join(ctx.outDir, rawName), ensureNewline(content));
    record.artifacts.push(rawName);
    record.errors.push("deep-triage response was not valid triage JSON; raw response saved");
    return;
  }

  const triageName = `${stateBase}-triage.json`;
  const triageDoc = {
    state: record.state,
    test: record.test,
    origin: triage.origin,
    rationale: triage.rationale,
    recommendedAction: triage.recommendedAction,
    model: ctx.model,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(ctx.outDir, triageName), `${JSON.stringify(triageDoc, null, 2)}\n`);
  record.artifacts.push(triageName);
  record.deepTriageOrigin = triage.origin;

  switch (triage.origin) {
    case "test":
      await runTestFix(ctx, record, state, stateBase);
      break;
    case "product":
      await runProductReport(ctx, record, state, stateBase);
      break;
    case "flake":
      appendFlake(ctx.outDir, record, state);
      break;
    case "environment":
      appendEnvAlert(ctx.outDir, record, state);
      break;
    default:
      record.errors.push(`deep triage returned unknown origin "${triage.origin}"`);
  }
}

async function dispatch(decision, state, record, ctx) {
  const stateBase = record.state.replace(/\.json$/i, "");
  switch (record.route) {
    case "flake-tracker":
      appendFlake(ctx.outDir, record, state);
      return;
    case "env-alert":
      appendEnvAlert(ctx.outDir, record, state);
      return;
    case "test-fix":
      await runTestFix(ctx, record, state, stateBase);
      return;
    case "product-report":
      await runProductReport(ctx, record, state, stateBase);
      return;
    case "escalate":
      await runEscalate(ctx, record, state, stateBase, decision);
      return;
    default:
      throw new Error(`unknown route "${record.route}" — nothing to do`);
  }
}

function printTable(records) {
  const headers = ["state", "route", "artifacts"];
  const rows = records.map((record) => [
    record.state,
    record.route,
    record.artifacts.length > 0 ? record.artifacts.join(", ") : "(none)",
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

  const runDir = path.resolve(args.run);
  const statesDir = path.join(runDir, "states");
  if (!fs.existsSync(statesDir)) {
    throw new CliError(`--run "${runDir}" does not contain a "states" directory`);
  }
  const decisions = loadDecisions(runDir);
  const states = loadStates(statesDir);
  const outDir = args.out ? path.resolve(args.out) : path.join(runDir, "actions");

  const apiKey = args.dryRun ? null : resolveApiKey();
  if (!args.dryRun && !apiKey) {
    throw new CliError(
      `no DeepSeek API key found — set ${KEY_ENV_VARS[0]}, or the fallback ${KEY_ENV_VARS[1]}, or rerun with --dry-run`,
    );
  }

  console.error(
    `[act] ${decisions.length} decision(s) from ${runDir} (${args.dryRun ? "dry-run" : `model ${args.model}`})`,
  );
  if (decisions.length === 0) console.error("[act] decisions.json contains 0 decisions — nothing to do");
  fs.mkdirSync(outDir, { recursive: true });

  const ctx = { apiKey: apiKey?.key ?? null, model: args.model, dryRun: args.dryRun, outDir };
  const records = [];

  for (const decision of decisions) {
    const start = performance.now();
    const record = {
      state: typeof decision?.state === "string" && decision.state ? decision.state : "(unknown state)",
      route: typeof decision?.route === "string" && decision.route ? decision.route : "(no route)",
      test: typeof decision?.test === "string" ? decision.test : "",
      llm: false,
      artifacts: [],
      errors: [],
      notes: [],
      timingMs: 0,
    };
    records.push(record);
    try {
      const entry = findState(states, record.state);
      if (!entry) throw new Error(`state document "${record.state}" not found in ${statesDir}`);
      if (entry.error) throw new Error(entry.error);
      const state = entry.state;
      if (typeof state.test === "string" && state.test) record.test = state.test;
      await dispatch(decision, state, record, ctx);
    } catch (err) {
      record.errors.push(err?.message ?? String(err));
    } finally {
      record.timingMs = Math.round(performance.now() - start);
    }
  }

  const byRoute = {};
  let llmCalls = 0;
  let errorCount = 0;
  for (const record of records) {
    byRoute[record.route] = (byRoute[record.route] ?? 0) + 1;
    if (record.llm) llmCalls++;
    errorCount += record.errors.length;
    if (record.errors.length > 0) console.error(`[act] ${record.state}: ${record.errors.join("; ")}`);
  }

  const manifest = {
    model: args.model,
    dryRun: args.dryRun,
    generatedAt: new Date().toISOString(),
    run: runDir,
    out: outDir,
    summary: { total: records.length, llmCalls, errors: errorCount, byRoute },
    states: records,
  };
  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.error(`[act] wrote ${manifestPath}`);

  printTable(records);
  const routeSummary = Object.entries(byRoute)
    .map(([route, count]) => `${route}=${count}`)
    .join(", ");
  console.log(`summary: total=${records.length} llmCalls=${llmCalls} errors=${errorCount} byRoute={${routeSummary}}`);
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.error(`[act] ${err.message}`);
    console.error(USAGE);
  } else {
    console.error(`[act] error: ${err?.message ?? err}`);
  }
  process.exit(1);
});


