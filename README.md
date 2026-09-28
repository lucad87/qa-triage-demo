# qa-triage-demo

Companion repo for the article **“Test Bug or Product Bug? Triaging Playwright Failures with a CPU-Only Decision Model and an LLM”** (blog.lucad.cloud).

**TaskDeck** is a tiny Next.js task board — the system under test. Around it: nine injected fault scenarios with ground-truth labels, and a triage pipeline that turns Playwright failures into verified test fixes or evidence-backed bug reports.

## Layout

- `app/` — TaskDeck: list, filters, counter, empty state; in-memory API with a test reset hook.
- `e2e/` — Playwright suite (one spec, four tests).
- `scenarios/` — nine fault scenarios (5 product, 2 test, 1 flake, 1 environment) with apply/revert tooling.
- `scripts/triage/` — the pipeline: `collect` → `distill` → `decide` (Laya) → `act` (DeepSeek) → `eval` → `verify`.
- `runs/` — the collected corpus: per-attempt Playwright results, distilled states, decisions, generated actions.
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
# 1. collect: apply each scenario, run the suite, snapshot artifacts, revert (Windows-only for now)
node scripts/triage/collect.mjs

# 2. distill: Playwright JSON results -> compact failure states
node scripts/triage/distill.mjs --results runs/<id>/attempt-1/results.json \
  --changed "app/page.tsx" --scenario scenarios/<id>.json --out runs/<id>/states

# 3. decide: Laya (ONNX, CPU) routes or abstains
node scripts/triage/decide.mjs --states runs/<id>/states --out runs/<id>/decisions.json

# 4. act: deep triage + artifacts (needs DEEPSEEK_API_KEY; --dry-run renders prompts only)
node scripts/triage/act.mjs --run runs/<id>

# 5. eval: decisions vs ground truth
node scripts/triage/eval.mjs

# 6. verify: swap a candidate fix into the spec, re-run the failing test, restore
node scripts/triage/verify.mjs --candidate runs/<id>/actions/state-01-spec.candidate.ts \
  --spec e2e/tasks.spec.ts --grep "<test title>" [--scenario <id>]
```

## CI

`.github/workflows/e2e-triage.yml` runs the Playwright suite and, on failures, the triage pipeline: Laya runs on CPU (model cache restored by `actions/cache`); without a `DEEPSEEK_API_KEY` repository secret, `act` runs in dry-run mode and the rendered prompts + decision artifacts are uploaded anyway.

## Notes

- The first `decide` run downloads the Laya ONNX bundle (~1.7 GB) into `~/.cache/receptron-laya` (cached in CI).
- `collect.mjs` port cleanup uses netstat/taskkill and is Windows-only for now.

## License

MIT — see [LICENSE](LICENSE).
