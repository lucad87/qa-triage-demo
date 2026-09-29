# Fine-tune results — qa-triage-demo

## Run #2 — the loop closes (2026-09-29)

- **Kernel**: [`lucad87/laya-triage-train`](https://www.kaggle.com/code/lucad87/laya-triage-train) v6 (private), adapted official notebook, 2×T4, 8 epochs.
- **Data**: 67 train / 10 val cases — 43 fault scenarios, 77 labeled states; the val split holds out 4 whole scenario groups.
- **In-kernel val (typed-decisions format)**: accuracy **0.775** (three training runs so far: 0.55 → 0.60 → 0.775 on the same 10-case split — treat ±0.1 as noise at this size), ECE 0.249, p50 282 ms/case. Report: `finetune/benchmark-report-3.json`.
- **Routing view (CI job `trained-eval`, fp32 bundle, all 77 corpus states)** — the number that matters:

| class | expected | total | auto | correct | wrong | abstain | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| product | product-report | 39 | **31** | **31** | 0 | 8 | 0.79 |
| test | test-fix | 24 | 0 | 0 | 0 | 24 | 0.00 |
| flake | flake-tracker | 4 | 0 | 0 | 0 | 4 | 0.00 |
| environment | env-alert | 10 | 0 | 0 | 0 | 10 | 0.00 |
| **all** | | **77** | **31** | **31** | **0** | **46** | **0.40** |

- **Precision on auto-decisions: 31/31 = 100%.** Origin argmax accuracy **66/77 (86%)** (run #1: 19/42 = 45%).
- Origin detail: **product 39/39** · test 22/24 · environment 5/10 (at conf 0.04–0.09) · flake 0/4.
- The two test misses (`test-renamed-label-drift`, origin predicted product at conf 0.51–0.56) were **stopped by the `product_side ≥ 0.75` gate** — the gate visibly does work.
- What changed vs run #1: the model went from "product bias with ~0.05 confidence everywhere" to **confident product detections** (conf 0.42–0.85, product_side 0.78–0.97) that auto-route with zero wrong calls, plus a correct `origin=test` signal (conf 0.30–0.49; the `test_side` noul head is still weak, so test states escalate at the second gate).

### INT8: produced, runs, and quietly fails — parked

The v6 kernel also exported a **dynamic-INT8** bundle (425 MB) with the fixed recipe: merge external data → `quant_pre_process(skip_symbolic_shape=True)` → strip `graph.value_info` (fixes the ORT `1028 vs 256` inference conflict) → `quantize_dynamic`. It **loads and runs** — but on real states it **flatlines**: origin probabilities collapse to ≈0.25 uniform (conf ≈ 0.0002) where fp32 gives 0.30–0.85. The in-kernel check missed it: it compared the two models on a random-token input on which fp32 itself was saturated (`[[1.0, 0.0], …]`, diff 0.0) — a false pass. An eval run on the INT8 bundle produced a fake "0/77 auto" before this was caught. `trained-eval` is **pinned to the fp32 bundle** (commit `a26a8c5`) until an INT8 validated on real inputs exists. Lesson: compare quantized models on real inputs, not on saturated dummies.

## Run #1 — seed scale (2026-09-28)

- **Data**: `laya-triage.train.jsonl` (32 cases → 128 sequences) / val (10 cases).
- **Recipe**: official RLCD DDP flow, 4 epochs (~1 min of GPU), calibration temperatures `[1.0, 1.0, 1.0]`.
- **Export**: receptron ONNX bundle, parity `max |dlogits| = 3.8e-06`. INT8 failed (shape inference) → fp32 only.
- **Kaggle val**: accuracy **0.55** · soft-acc 0.547 · ECE 0.138 · p50 255 ms/case.
- **Routing view (CI, 42 states)**: all-escalate, origin 19/42 (45%) (product 17/17, test 2/16, env 0/6, flake 0/3), mean conf ≈ 0.05.

## Reading

Run #1 showed the loop works end-to-end but the model at seed scale only learns a "product" bias without usable confidence. Run #2 (4× the data, 8 epochs, same pipeline) flips that: **product failures now auto-route as product reports with 100% precision**, the test origin signal is largely correct, and everything the model is unsure about still escalates. The gate + escalation path stayed constant across both runs — the model was the only variable, which is exactly the property the design wanted.

Next iteration ideas: grow the flake/environment classes (3–4 examples each today), investigate why the `test_side` head stays under its 0.75 gate despite correct origin, and re-attempt INT8 with real-input validation baked into the kernel.

## Artifacts

- `finetune/benchmark-report.json` (run #1 val) · `benchmark-report-2.json` (v4 retrain val 0.60) · `benchmark-report-3.json` (v6 val 0.775)
- `runs/eval-report-tuned.md|json` (run #1 routing) · `runs/eval-report-tuned-2.md|json` (run #2 routing, fp32)
- Model bundles: Kaggle kernel output — `onnx_fp32/` (~1.69 GB, in use) and `onnx_int8/` (~425 MB, parked: see above).
