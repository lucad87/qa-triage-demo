#!/usr/bin/env node
// Internal ablation: what does the base Laya checkpoint actually respond to?
// Runs the same origin/test_side/product_side/severity questions over graded
// representations of two real failure states (product bug + selector drift):
//   A full state as distilled by distill.mjs v2
//   B full minus attachments (the only tail field we suspect is truncated away)
//   C prioritized compact: key fields first, noise dropped
//   D core: no test source at all
//   E hand-written digest (the "perfect human summary" control)
// Prints one line per variant; compares choice/probabilities/confidence.

import fs from "node:fs";
import { Laya } from "@receptron/laya";

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

const load = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function variants(s, digest) {
  const { attachments, durationMs, ...noExtras } = s;
  const prioritized = {
    test: s.test, status: s.status, retry: s.retry,
    changedFiles: s.changedFiles, diff: s.diff, error: s.error, testSource: s.testSource
  };
  const core = { test: s.test, status: s.status, retry: s.retry, changedFiles: s.changedFiles, diff: s.diff, error: s.error };
  return [
    ["A-full", s],
    ["B-noAttachments", noExtras],
    ["C-prioritized", prioritized],
    ["D-core", core],
    ["E-digest", digest]
  ];
}

const cases = [
  {
    name: "counter (product)",
    state: load("runs/product-counter-counts-all/states/state-01.json"),
    digest:
      'Playwright failure triage. Test: "completing a task updates the counter and the Done filter". ' +
      'Symptom: after completing the only task, the active counter still shows "1" instead of "0" ' +
      '(expect toHaveText("0") received "1"). The failure reproduced on both attempts. ' +
      "The commit changed app/page.tsx: the active counter now counts all tasks instead of only the incomplete ones."
  },
  {
    name: "drift (test)",
    state: load("runs/test-renamed-label-drift/states/state-01.json"),
    digest:
      'Playwright failure triage. Test: "creating a task shows it in the list and updates the counter". ' +
      'Symptom: locator getByLabel("New task") resolves to 0 elements — the input cannot be found and the test times out (30s). ' +
      'Both attempts failed. The commit changed app/page.tsx: the input aria-label was renamed from "New task" to "Task title"; ' +
      "the spec file was not updated."
  }
];

const laya = await Laya.load({});
for (const c of cases) {
  for (const [vname, state] of variants(c.state, c.digest)) {
    const r = await laya.systemOne(state, QUESTIONS);
    const o = r.answers.origin;
    const probs = Object.entries(o.probabilities).map(([k, v]) => `${k}=${v}`).join(" ");
    console.log(
      `${c.name.padEnd(17)} ${vname.padEnd(16)} choice=${o.choice.padEnd(12)} conf=${o.confidence} ` +
      `[${probs}] test_side=${r.answers.test_side.noul} product_side=${r.answers.product_side.noul} tokens=${r.usage.input_tokens}`
    );
  }
}
await laya.close();
