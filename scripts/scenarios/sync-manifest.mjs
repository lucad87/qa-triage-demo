#!/usr/bin/env node
// Rebuild scenarios/manifest.json from the scenario files on disk.
//
// Keeps the existing manifest order for scenarios already listed, then appends
// any new scenario files (sorted by id). Idempotent.
//
// Usage: node scripts/scenarios/sync-manifest.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scenariosDir = path.join(root, "scenarios");
const manifestPath = path.join(scenariosDir, "manifest.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.scenarios)) {
  console.error("[sync-manifest] manifest.json has no scenarios array — refusing to touch it");
  process.exit(1);
}

const listed = new Set(manifest.scenarios.map((entry) => entry.id));
const files = fs
  .readdirSync(scenariosDir)
  .filter((name) => name.endsWith(".json") && name !== "manifest.json")
  .sort();

const missing = [];
for (const file of files) {
  const id = file.replace(/\.json$/, "");
  if (!listed.has(id)) missing.push({ id, file: `scenarios/${file}` });
}

let appended = 0;
for (const { id, file } of missing) {
  const scenario = JSON.parse(fs.readFileSync(path.join(scenariosDir, path.basename(file)), "utf8"));
  if (scenario.id !== id) {
    console.error(`[sync-manifest] ${file}: id mismatch ("${scenario.id}" vs file name) — fix the file first`);
    process.exit(1);
  }
  manifest.scenarios.push({ id, class: scenario.class, file });
  appended += 1;
}

// Drop manifest entries whose file no longer exists (keeps the manifest honest).
const onDisk = new Set(files);
const before = manifest.scenarios.length;
manifest.scenarios = manifest.scenarios.filter((entry) => onDisk.has(path.basename(entry.file)));
const removed = before - manifest.scenarios.length;

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[sync-manifest] entries: ${manifest.scenarios.length} (appended ${appended}, removed ${removed})`);
