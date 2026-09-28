# NEXT-STEPS — qa-triage-demo

Aggiornato: 2026-09-28. Questo file è il piano di lavoro della demo per l'articolo.

## Contesto
Articolo per blog.lucad.cloud: Playwright in CI + **Laya** (decision model CPU/ONNX) + **LLM (DeepSeek)** per triare i fallimenti: fix del test (verificato) quando è il test, bug report quando è il prodotto.

## Fatto ✓
- Demo app **TaskDeck** + suite Playwright baseline verde; **repo GitHub** `lucad87/qa-triage-demo` + **CI** (e2e + triage) verde.
- **Pipeline**: `scripts/triage/{collect,distill,decide,act,eval,verify}.mjs` e `scripts/scenarios/{apply,sync-manifest}.mjs`.
- **Corpus**: **24 scenari** (11 product, 9 test, 2 flake, 2 environment) + baseline + `flake-evidence`; stati etichettati in `runs/`.
- **Step 1+2**: gate onesto (soglia su tutte le route) + input v2 (diff, testSource, errore pulito) + ablazione → limite = modello base; Laya zero-shot astiene su tutto.
- **Step 4** (LLM live): deep-triage **16/17** corretto; patch test generate e **verificate PASS**; 10 bug report; env alert.
- **Punto 1 — DATASET FINE-TUNE** ✓ (2026-09-28): `scripts/triage/make-finetune-dataset.mjs` → `finetune/` con **42 righe** (train 32 / val 10; product 17, test 16, environment 6, flake 3), formato = `LocalLLaMA/typed-decisions` (notebook ufficiale Laya). Split per gruppo-scenario (no leakage). Dettagli in `finetune/README.md`.
  - Nota di qualità: `product-post-accepts-blank` **scartato** (fallimento non deterministico — race nel test) e sostituito con `product-create-duplicates`. La verifica live della raccolta è servita proprio a questo.

## Da fare dopo — percorso fine-tune di Laya
2. **Training** — notebook ufficiale `laya_finetune_typed_decisions_2xT4_kaggle.ipynb` (Kaggle, 2×T4 gratis): caricare `finetune/laya-triage.train.jsonl` (+ val) al posto del dataset pubblico; include la calibrazione delle temperature.
3. **Export ONNX** — `export/export_onnx.py` dal checkpoint fine-tuned → bundle per `@receptron/laya` (o `--modelDir`-style in `decide.mjs`).
4. **Misura before/after** — rilanciare `decide` + `eval` col modello nuovo: copertura/accuratezza vs astensioni (il "prima" è in `runs/eval-report.md`).

## Altri filoni aperti
- **Generatore locale al posto di DeepSeek** (Qwen3-4B-Instruct-2507 + ONNX GenAI int4 + constrained decoding): Esperimento 1 = prompt-only sugli stati del corpus, confronto qualità/latenza con DeepSeek (16/17). Decidere se farlo prima o dopo il training di Laya.
- **Articolo**: bozza v0.1 in `D:\openwork\posts\playwright-failure-triage-draft.md` — restano figure, revisione, e repo da rendere pubblico alla pubblicazione.
- **Rifiniture**: `classifyResults` in `collect.mjs` (flaky prima di failed); `verify.mjs` per scenari che editano lo spec (oggi usarlo senza `--scenario`); pulizia file interni prima della pubblicazione.

## Note operative
- Chiave DeepSeek in env (`LPR_AMXVA_DEEPSEEK_API_KEY`).
- `@receptron/laya` 0.1.2; cache modello `%USERPROFILE%\.cache\receptron-laya` (~1.6 GB, calda).
- Il blog (`lucad87/qa-blog`) NON si tocca.
