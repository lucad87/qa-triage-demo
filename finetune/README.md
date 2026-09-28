# Laya fine-tuning dataset — Playwright triage

Generated from the labeled failure corpus in `runs/` by:

```bash
node scripts/triage/make-finetune-dataset.mjs
```

Regenerate it after every corpus change (new scenarios, new collection cycles).

## Files

- `laya-triage.all.jsonl` — every labeled failure state
- `laya-triage.train.jsonl` / `laya-triage.val.jsonl` — split **by scenario group**, never by state
  (states produced by one fault injection are near-duplicates; a state-level split would leak)
- `summary.json` — counts, split groups, generation timestamp

## Row format

Mirrors [`LocalLLaMA/typed-decisions`](https://huggingface.co/datasets/LocalLLaMA/typed-decisions),
the public dataset used by Laya's official fine-tuning notebook:

```json
{
  "id": "product-create-duplicates_state-01",
  "workflow": "playwright-triage",
  "state": "{...}",     // the same compact failure state fed to Laya at inference time
  "questions": "{...}", // origin (choice) / test_side (noul) / product_side (noul) / severity (score)
  "gold": "{...}"       // per question: { type, label, probabilities, confidence, ... }
}
```

- `state` / `questions` / `gold` are JSON **strings** (same as the public dataset).
- Targets are soft distributions derived from the scenario ground truth with mild smoothing
  (the correct `origin` label gets 0.9; the remainder is spread evenly).
- **Severity labels are heuristic** — see `SEVERITY_BY_RUN` / `SEVERITY_BY_CLASS` in the generator.
  Product bugs carry a per-scenario judgement; everything else counts as no product impact.
  Refine before any serious training run.

## How to use it with the official notebook

The official notebook is `notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb` in the
[Laya repo](https://github.com/NandhaKishorM/laya). It trains `convaiinnovations/laya` on the
public dataset with RLCD + proper scoring rules on Kaggle's free 2×T4 GPUs, fits calibration
temperatures, and exports an ONNX bundle.

To train on this dataset instead (or to mix it with the public one):

1. Upload the JSONL files as a private HF dataset or a Kaggle dataset
   (e.g. `<you>/laya-triage-finetune`).
2. In the notebook, replace:

   ```python
   ds_train = load_dataset("LocalLLaMA/typed-decisions", "all", split="train")
   ```

   with:

   ```python
   ds_train = load_dataset("json", data_files="laya-triage.train.jsonl", split="train")
   # or, from the Hub: load_dataset("<you>/laya-triage-finetune", split="train")
   ```

   and point the test-split lines at `laya-triage.val.jsonl`.
3. Everything else (tokenization, DDP training, calibration, ONNX export via
   `export/export_onnx.py`) stays as in the notebook.

## Notes

- The dataset is a **seed**, intentionally small. Expand the corpus (more scenarios, more
  collection cycles) before drawing conclusions from a fine-tune run.
- Keep the split by scenario group; if you add evidence sub-runs, alias them to their parent
  scenario in `GROUP_ALIAS` inside the generator.
