# Fine-tune results — qa-triage-demo

## Round 3 (current model): 49 scenarios, 92 states — coverage 0.84, precision 100%

- **Kernel**: [`lucad87/laya-triage-train`](https://www.kaggle.com/code/lucad87/laya-triage-train) v7 (private), adapted official notebook, 2×T4, 8 epochs (~12 min).
- **Data**: 92 labeled states from 49 fault scenarios (82 train / 10 val; split by scenario group). Corpus rounds: 9 → 24 → 43 → 49 scenarios.
- **In-kernel val (typed-decisions format)**: accuracy **0.95** (val n=10 — noisy; history: 0.55 → 0.60 → 0.775 → 0.95), soft-acc 0.7445, ECE 0.163, p50 286 ms/case. Report: `finetune/benchmark-report-4.json`.
- **Routing view (CI job `trained-eval`, fp32 bundle, all 92 states)**:

| stage | gates (conf / noul) | auto | correct | wrong | abstain | coverage |
| --- | --- | --- | --- | --- | --- | --- |
| eval run #3 (shipped gates) | 0.30 / 0.75 | 65 | 65 | 0 | 27 | 0.71 |
| **eval run #4 (fitted gates)** | **0.30 / 0.65** | **77** | **77** | **0** | **15** | **0.84** |

By class (run #4):

| class | expected | total | auto | correct | wrong | abstain | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| product | product-report | 39 | 39 | 39 | 0 | 0 | **1.00** |
| environment | env-alert | 22 | 22 | 22 | 0 | 0 | **1.00** |
| test | test-fix | 24 | 11 | 11 | 0 | 13 | 0.46 |
| flake | flake-tracker | 7 | 5 | 5 | 0 | 2 | 0.71 |
| **all** | | **92** | **77** | **77 (100% precision)** | **0** | **15** | **0.84** |

What changed in round 3 — two levers, one variable each:
1. **Corpus growth, focused on the weak classes** (6 new scenarios: 3 flake, 3 environment) plus a CI fix so flake scenarios are distilled from the *first failing attempt* (they can be green on attempt 1). Effect at run #3: environment 0/10 → 22/22, flake 0/4 → 5/7, test 0/24 → 0/24 but origin correct on 23/24 with test_side rising to 0.53–0.75.
2. **Threshold fitting** (see below): 65 → 77 automatic decisions, all correct.

### Threshold fitting

The routing gates (`--conf 0.30`, `--min-noul 0.75`) were first-cut placeholders. Re-routing the run-#3 answers over a gate grid:

| conf \ noul | 0.60 | 0.65 | 0.70 | 0.75 | 0.80 |
| --- | --- | --- | --- | --- | --- |
| 0.25 | 82/80/**2** | 78/77/**1** | 68/68/0 | 65/65/0 | 63/63/0 |
| 0.30 | 81/80/**1** | **77/77/0** | 68/68/0 | 65/65/0 | 63/63/0 |
| 0.35 | 81/80/**1** | 77/77/0 | 68/68/0 | 65/65/0 | 63/63/0 |

(cells: auto/correct/**wrong** over the 92 states.) **conf 0.30 / noul 0.65 is the maximal zero-wrong point** → adopted as the new defaults in `scripts/triage/decide.mjs`; eval run #4 re-ran the whole pipeline end-to-end and confirmed 77/77/0. Caveat: the point is fitted (resubstitution) on this corpus — re-fit whenever the corpus or the model changes. At noul 0.60 the first wrong decisions appear (a test-renamed-label-drift state crossing product_side), so 0.65 keeps margin.

## History — rounds 1-2

- **Run #1** (2026-09-28): 32 train cases, 4 epochs, val 0.55. Routing over 42 states: all-escalate, origin 19/42 (45%), mean conf ≈ 0.05. The loop worked end-to-end; the model learned only a "product" bias.
- **Run #2** (v6, 77 states): val 0.775. Routing over 77 states with old gates: 31/77 auto (coverage 0.40), product 31/39, everything else abstained. INT8 export produced a bundle that loads and runs but **flatlines** on real inputs (uniform probs, conf ≈ 0.0002) — CI pinned to fp32.
- Reports: `runs/eval-report-tuned.md|json` (#1) · `-2` (#2) · `-3` (#3, pre-fit gates) · `-4` (#4, fitted gates).

## Artifacts

- Routing reports: `runs/eval-report-tuned{,-2,-3,-4}.md|json`
- Val reports: `finetune/benchmark-report.json` (0.55) · `-2` (0.60) · `-3` (0.775) · `-4` (0.95)
- Model bundles: Kaggle kernel output — `onnx_fp32/` (in use) and `onnx_int8/` (parked; see run-#2 note)
