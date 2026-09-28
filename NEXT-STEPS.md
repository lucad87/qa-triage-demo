# NEXT-STEPS — qa-triage-demo

Aggiornato: 2026-09-28 (notte). Questo file è il piano di lavoro della demo per l'articolo.

## Contesto
Articolo per blog.lucad.cloud: Playwright in CI + **Laya** (decision model CPU/ONNX) + **LLM (DeepSeek)** per triare i fallimenti: fix del test (verificato) quando è il test, bug report quando è il prodotto.

## Fatto ✓
- Demo app **TaskDeck** + suite Playwright; **repo** `lucad87/qa-triage-demo` + **CI** (e2e + triage) verde.
- **Pipeline**: `scripts/triage/{collect,distill,decide,act,eval,verify,make-finetune-dataset}.mjs` + `scripts/scenarios/{apply,sync-manifest}.mjs`.
- **Corpus**: **24 scenari** (11 product, 9 test, 2 flake, 2 environment) + baseline + `flake-evidence`; 42 stati etichettati in `runs/`.
- **Step 1+2**: gate onesto + input v2 + ablazione → zero-shot: tutto in astensione. `runs/eval-report.md` (zeroshot), `runs/eval-report-v0.md` (gate ingenuo).
- **Step 4**: azioni LLM live — deep-triage **16/17**, patch test **verificate PASS**, 10 bug report, env alert.
- **Fine-tune (punti 1→4) COMPLETATO end-to-end**:
  1. Dataset (`finetune/`, 42 righe, formato ufficiale `LocalLLaMA/typed-decisions`) ✓
  2. Training su **Kaggle** — kernel `lucad87/laya-triage-train` (adattato dal notebook ufficiale; 128 sequenze, 4 epoche, ~1 min su 2×T4) ✓
  3. **Export ONNX** (parità 3.8e-06) ✓ — INT8 fallito (shape inference), bundle fp32
  4. **Eval in GitHub Actions** (job `trained-eval`, workflow_dispatch: scarica il modello dall'output Kaggle → decide `--model-dir` → eval) ✓
- **Risultati run #1** (dettagli in `finetune/RESULTS.md`): val Kaggle acc 0.55 / ECE 0.138 / 255ms; routing: origin 45% (product 17/17, test 2/16, env 0/6, flake 0/3), confidenza media 0.05 → **0 decisioni automatiche, 42 astensioni** (il gate tiene). Il fine-tune a scala-seed impara un bias parziale; il valore è il **loop** ora completo e ripetibile.

## Da fare dopo (in ordine)
1. **Fine-tune #2**: espandere il corpus (es. +50/100 scenari, o più giri di raccolta) e rilanciare: `collect` → `make-finetune-dataset` → kernel Kaggle → `trained-eval`; confronto con lo stesso eval. (Opzionale: bilanciamento classi / epoche, ordine campi dello stato.)
2. **Fix quantizzazione INT8** (shape inference sul grafo dynamo) → bundle ~430MB e CI più veloce.
3. **Articolo**: aggiornare la bozza (`D:\openwork\posts\playwright-failure-triage-draft.md`) con il capitolo "data loop" (risultati fine-tune #1, onesti), figure, revisione; repo pubblico alla pubblicazione.
4. **Rifiniture**: `classifyResults` in `collect.mjs` (flaky prima di failed); `verify.mjs` per scenari che editano lo spec; nota: dataset NON si monta nelle run API Kaggle (kernel auto-contenuto con dati base64).

## Note operative
- Token Kaggle: in `%USERPROFILE%\.kaggle\kaggle.json` + env `KAGGLE_API_TOKEN` (persistita) + **secret del repo** `KAGGLE_API_TOKEN` (usato dal job `trained-eval`). Da rigenerare quando il progetto è chiuso (è passato in chat).
- Chiave DeepSeek in env (`LPR_AMXVA_DEEPSEEK_API_KEY`); modello Laya cache in `%USERPROFILE%\.cache\receptron-laya`.
- Il blog (`lucad87/qa-blog`) NON si tocca.
