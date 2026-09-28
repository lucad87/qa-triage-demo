# NEXT-STEPS — qa-triage-demo

Aggiornato: 2026-09-29 notte (sessione interrotta su richiesta — riprendere da qui).

## RIPRESA — cosa fare al prossimo avvio

1. **CI in corso**: run `36490348151` = `trained-eval` sul modello **run #2** (kernel v4). Era `in_progress` alla chiusura; il job continua da solo su GitHub.
   - Controlla: `gh run view 36490348151 -R lucad87/qa-triage-demo --json status,conclusion,jobs`
   - Scarica l'artefatto: `gh run download 36490348151 -R lucad87/qa-triage-demo -n tuned-eval-results -D <dir>`
   - Confronta con il run #1 (`runs/eval-report-tuned.md`, `finetune/RESULTS.md`), aggiorna `finetune/RESULTS.md` con il confronto, commit + push.
2. **Punto 2 — INT8**: 2 tentativi falliti (shape inference ORT sul grafo dynamo; anche `quantization.preprocess` crasha). Pronto il patch con la **scala di tentativi**:
   - `C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\patch-kernel-v3.cjs` → patcha il notebook kernel (attempt 1: export legacy TorchScript + quantize; attempt 2: preprocess `--skip_symbolic_shape` + quantize; fallback: fp32).
   - Passi: `node patch-kernel-v3.cjs` → `kaggle kernels push -p C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\kernel` (con `$env:KAGGLE_API_TOKEN` e `$env:PYTHONUTF8=1`) → verifica log.
   - Se INT8 riesce: aggiornare il job `trained-eval` del workflow per preferire `model/onnx_int8` (fallback fp32) e opzionalmente rilanciare l'eval per validare il bundle int8 in CI.
3. **Attenzione**: non lanciare altri `workflow_dispatch` mentre il run 36490348151 è in corso (il concurrency group li cancella a vicenda).

## Stato dei punti 1 e 2 (sessione appena chiusa)
- **Corpus round 2**: 19 nuovi scenari (totale **43**), raccolti **in CI** (job `collect-corpus`, Linux) — 19/20 ok al primo giro, `flake-random-post-500` distillato dall'attempt 2 (attempt 1 verde per design del flake). Commit `1f3b7a4` + `7a4a6cd`.
- **Dataset fine-tune**: **77 righe** (train 67 / val 10) — `finetune/`.
- **Kernel v4 (run #2)**: eseguito su Kaggle — 67 casi → 268 sequenze, **8 epoche**, loss 1.91→0.77, temperature `[1.0, 1.0, 0.238]`, export ONNX parità 1.49e-06. Val metrics: **accuracy 0.60** (run#1: 0.55), soft-acc 0.469, Brier 0.367, ECE 0.174, 264 ms → `finetune/benchmark-report-2.json`.
- **INT8**: non riuscito in v4 (stesso errore del run #1) → bundle fp32.
- **Da committare (fatto nell'ultimo commit della sessione)**: `finetune/benchmark-report-2.json` + questo file.

## Contesto (per chi riprende)
Articolo per blog.lucad.cloud: Playwright in CI + **Laya** (decision model CPU/ONNX) + **LLM (DeepSeek)** per triare i fallimenti. Fine-tune di Laya sul corpus etichettato, modello esportato in ONNX e valutato in GitHub Actions.

## Numeri chiave
- Run #1 routing (CI): origin 45% (product 17/17, test 2/16, env 0/6, flake 0/3), conf 0.05 → 42 astensioni.
- Run #2: val acc 0.60; routing atteso dall'artefatto del run CI qui sopra.
- Step 1+2 (zero-shot): `runs/eval-report.md`; gate ingenuo: `runs/eval-report-v0.md`; fine-tune #1: `runs/eval-report-tuned.md`.

## Note operative
- Token Kaggle: `%USERPROFILE%\.kaggle\kaggle.json` + env `KAGGLE_API_TOKEN` (persistita) + secret repo `KAGGLE_API_TOKEN`. **Da rigenerare a fine progetto** (passato in chat).
- Chiave DeepSeek in env (`LPR_AMXVA_DEEPSEEK_API_KEY`).
- Kernel: `lucad87/laya-triage-train` (Kaggle); CI: `.github/workflows/e2e-triage.yml` (job: e2e, triage, collect-corpus, trained-eval).
- Builders/patchers in `C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\` (`build-kernel-v2.cjs`, `patch-kernel-v3.cjs`, script di analisi).
- Il blog (`lucad87/qa-blog`) NON si tocca.
