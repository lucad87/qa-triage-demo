# Fine-tune run #1 — results (2026-09-28)

- **Kernel**: [`lucad87/laya-triage-train`](https://www.kaggle.com/code/lucad87/laya-triage-train) (private) — adapted official notebook, 2×T4.
- **Data**: `laya-triage.train.jsonl` (32 cases → 128 sequences) / `laya-triage.val.jsonl` (10 cases → 40 decisions).
- **Recipe**: official RLCD DDP flow, 4 epochs (~1 min of GPU), calibration temperatures fitted on 12 held-out items → `[1.0, 1.0, 1.0]`.
- **Export**: receptron ONNX bundle, parity `max |dlogits| = 3.8e-06`. INT8 quantization **failed** (shape inference) → fp32 bundle shipped.

## Eval A — Kaggle val metrics (Python agent, GPU)

accuracy **0.55** · soft-acc 0.547 · ECE 0.138 · within-1-level 1.00 · p50 **255 ms/case**.
(Computed across all four question types on the 10 held-out cases.)

## Eval B — routing view (decide + eval in GitHub Actions, job `trained-eval`)

Over the 42-state corpus (this is the number that matters for triage routing):

| class | origin correct | auto route | abstain |
| --- | --- | --- | --- |
| product | **17/17** | 0 | 17 |
| test | 2/16 | 0 | 16 |
| environment | 0/6 | 0 | 6 |
| flake | 0/3 | 0 | 3 |
| **all** | **19/42 (45%)** | **0** | **42** |

Held-out groups only: 3/10. Mean origin confidence ≈ **0.05** → every state still escalates; the confidence gate holds.

## Reading

At seed scale the fine-tune learns a partial bias ("product") but not the taxonomy — exactly what a
128-sequence, ~1-minute training run can deliver. The value of this run is the **loop**: dataset →
training → ONNX export → CI evaluation, fully repeatable (`collect` → `make-finetune-dataset` →
Kaggle kernel → `trained-eval`). Next iteration: expand the corpus (mechanically, more scenarios and
collection cycles), optionally balance classes and epoch count, and re-run against the same eval.

## Artifacts

- `finetune/benchmark-report.json` — val metrics as computed inside the kernel
- `runs/eval-report-tuned.md|json`, `runs/*/decisions-tuned.json` — routing eval from CI
- Model bundle: Kaggle kernel output (`onnx_fp32/`, ~1.6 GB fp32 + fine-tuned PyTorch checkpoint ~0.8 GB)
