# qa-triage-demo

Companion repo for the article **"Test Bug or Product Bug? Triaging Playwright Failures with a CPU-Only Decision Model and an LLM"** (blog.lucad.cloud).

**TaskDeck** is a tiny Next.js task board — the system under test. Around it: **49 injected fault scenarios** with ground-truth labels, a triage pipeline that turns Playwright failures into verified test fixes or evidence-backed bug reports, and the fine-tuning loop (Kaggle training → ONNX export → CI evaluation) for the decision model.

## Layout

- `app/` — TaskDeck: list, filters, counter, empty state; in-memory API with a test reset hook.
- `e2e/` — Playwright suite (one spec, four tests).
- `scenarios/` — 49 fault scenarios (21 product, 16 test, 6 flake, 6 environment) with apply/revert tooling; `node scripts/scenarios/sync-manifest.mjs` rebuilds the manifest after adding scenario files.
- `scripts/triage/` — the pipeline: `collect` → `distill` → `decide` (Laya) → `act` (DeepSeek) → `eval` → `verify`, plus `make-finetune-dataset` and `_ablate` (experiment).
- `runs/` — the collected corpus: per-attempt Playwright results, distilled states, decisions, generated actions.
- `finetune/` — the fine-tuning dataset and results for Laya (see [`finetune/RESULTS.md`](finetune/RESULTS.md)).
- `NEXT-STEPS.md` — working notes (Italian).

## Quick start

```bash
npm install
npm run dev          # http://localhost:3100
npm run test:e2e     # builds the app, starts it, runs Playwright
```

## Fault scenarios

```bash
node scripts/scenarios/apply.mjs --list          # ids + classes
node scripts/scenarios/apply.mjs --check         # all edits valid, tree clean
node scripts/scenarios/apply.mjs <id> --apply    # inject one fault
node scripts/scenarios/apply.mjs <id> --revert   # undo it
```

## The triage pipeline

```bash
# 1. collect: apply each scenario, run the suite, snapshot artifacts, revert (Windows-only collector)
node scripts/triage/collect.mjs

# 2. distill: Playwright JSON results -> compact failure states
node scripts/triage/distill.mjs --results runs/<id>/attempt-1/results.json \
  --changed "app/page.tsx" --scenario scenarios/<id>.json --out runs/<id>/states

# 3. decide: Laya (ONNX, CPU) routes or abstains; use --model-dir <bundle> for the fine-tuned model
node scripts/triage/decide.mjs --states runs/<id>/states --out runs/<id>/decisions.json

# 4. act: deep triage + artifacts (needs DEEPSEEK_API_KEY; --dry-run renders prompts only)
node scripts/triage/act.mjs --run runs/<id>

# 5. eval: decisions vs ground truth
node scripts/triage/eval.mjs

# 6. verify: swap a candidate fix into the spec, re-run the failing test, restore
node scripts/triage/verify.mjs --candidate runs/<id>/actions/state-01-spec.candidate.ts \
  --spec e2e/tasks.spec.ts --grep "<test title>" [--scenario <id>]
```

## Fine-tuned decision model

`decide.mjs` runs the fine-tuned Laya bundle (fp32) when pointed at it with `--model-dir`; without it, it falls back to the public base checkpoint (cached under `~/.cache/receptron-laya`, ~1.7 GB). The fine-tune loop and the current operating point (fitted gates, 77/92 auto-routed, 100% precision) are documented in [`finetune/RESULTS.md`](finetune/RESULTS.md); the training kernel is `lucad87/laya-triage-train` on Kaggle.

## CI

- `.github/workflows/e2e-triage.yml` — the main loop: Playwright suite, failure triage (Laya → DeepSeek), corpus collection (`collect_only` input) and the fine-tuned-model evaluation (`trained-eval`, fetches the model from the Kaggle kernel output).
- `.github/workflows/demo-pipe.yml` — a watchable end-to-end demo (~5 min): decide → act → verify over stored corpus states.

## Notes

- `collect.mjs` port cleanup uses netstat/taskkill and is Windows-only for now.
- The corpus is text-first; Playwright traces/screenshots live in the CI artifacts and locally under `runs/*/attempt-*/test-results/`.

## License

MIT — see [LICENSE](LICENSE).
