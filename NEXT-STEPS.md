# NEXT-STEPS — qa-triage-demo

Aggiornato: 2026-09-29 (sessione INT8 — ricetta risolta, kernel v6 COMPLETE, eval run #2 da dispatchare).

## RIPRESA — cosa fare al prossimo avvio

1. **Kernel v6 su Kaggle** (`lucad87/laya-triage-train`, version 6 = **COMPLETE**):
   - Ricetta INT8 **RISOLTA e validata**: in locale (11 stati / 4 scenari) e **in-kernel** (`int8 vs fp32 max|delta act_probs| = 0.0`); patch nel kernel: `patch-kernel-v4.cjs`.
   - Output v6 scaricato in `...\kaggle-triage\v6-out\`: `onnx_int8` (425 MB) **e** `onnx_fp32` (1.7 GB, conservato) + checkpoint + benchmark report.
   - Val metrics v6 (10 case): accuracy **0.775** (run #1: 0.55, run #2: 0.60 — alta varianza, n=10).
   - Smoke locale v6-int8: load ~1.2 s, 5 stati / 2 scenari OK.
2. **Appena v6 è COMPLETE**: dispatchare l'eval del run #2 — **un solo dispatch, nessun altro run in parallelo**:
   - `gh workflow run e2e-triage.yml -R lucad87/qa-triage-demo` (input `collect_only` vuoto → girano anche `trained-eval`; il job scarica l'output del kernel e preferisce `model/onnx_int8` con fallback `model/onnx_fp32`).
   - ⚠️ Il run trained-eval precedente (`36543108983`) è **FALLITO**: usava l'int8 legacy rotto del v5 (`Reshape ... Input shape:{556,4,1024}, requested shape:{40,64,64}`) e il fp32 del v5 era stato cancellato dal cleanup. Con v6 entrambi i bundle esistono e l'int8 è validato in-kernel.
   - Attendere la fine, poi: `gh run download <id> -R lucad87/qa-triage-demo -n tuned-eval-results -D <dir>`.
3. **Confronto run #1 vs run #2** → aggiornare `finetune/RESULTS.md` (+ `runs/eval-report-tuned.md` se serve) → **commit** (da fare SOLO a run finito: il concurrency group cancella i run in corso se arriva un push/dispatch).
4. **Articolo** (`D:\openwork\posts\playwright-failure-triage-draft.md`): aggiornare/integrare i numeri del run #2 quando disponibili.

## INT8 — la ricetta validata (2026-09-29)

Problemi incontrati e fix (esperimenti locali, `int8-experiment*.py` in `...\kaggle-triage\`):
1. `quant_pre_process` sul bundle con external data → `ValidationError: ... should be stored in ...temp...\laya.onnx.data` (il temp-dir non porta il `.data`) → **fix: merge in file singolo** (`onnx.save_model(..., save_as_external_data=False)`, 1.69 GB, ~2.5 s).
2. `quantize_dynamic` → `[ShapeInferenceError] Inferred shape and existing shape differ in dimension 0: (1028) vs (256)` — conflitto tra annotazioni intermedie (`value_info`, 2113 entry, es. `cat_58 [batch, 1028]` vs inferito 256) → **fix: `del m.graph.value_info[:]`** dopo il preprocess.
3. Risultato: **int8 421.9 MB**, load in @receptron/laya **~1.2 s** (vs 4.8 s fp32), smoke OK su **11 stati / 4 scenari** (i più grandi e i più piccoli: test-wrong-route, product-double-submit, flake-evidence, env-wrong-baseurl), routing coerente col run #1 (tutti escalate, conf 0.00).

Artefatti locali:
- Bundle int8 (pesi run #1): `C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\int8-local\bundle`
- Bundle fp32 (pesi run #1, validato): `C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\output\onnx_fp32`
- Script: `int8-experiment2.py` (merge+preprocess+quantize), `int8-experiment3.py` (variante con strip+diagnostica), patcher kernel: `patch-kernel-v4.cjs`.

## Stato corpus / CI

- Corpus: **43 scenari** (21 product, 16 test, 3 flake, 3 env); dataset fine-tune **77 righe** (train 67 / val 10).
- Run #1 routing (CI): origin 45% (product 17/17, test 2/16, env 0/6, flake 0/3), conf media 0.05 → 42 astensioni.
- Run #2 (kernel v4/v5): val acc **0.60** (run#1 0.55), ECE 0.174, 264 ms → `finetune/benchmark-report-2.json`; routing CI = questo giro.
- Zero-shot: `runs/eval-report.md`; gate ingenuo: `runs/eval-report-v0.md`; fine-tune #1: `runs/eval-report-tuned.md`.
- **Storico cancellazioni**: il concurrency group di `e2e-triage.yml` cancella i run in corso se arriva un push su main o un altro `workflow_dispatch`. MAI pushare/dispatchare mentre `trained-eval` gira.

## Note operative

- Token Kaggle: `%USERPROFILE%\.kaggle\kaggle.json` + env `KAGGLE_API_TOKEN` (persistita) + secret repo `KAGGLE_API_TOKEN`. **Da rigenerare a fine progetto** (passato in chat).
- Su Windows la kaggle CLI richiede `$env:PYTHONUTF8=1` (errore charmap 0x8f).
- Chiave DeepSeek in env (`LPR_AMXVA_DEEPSEEK_API_KEY`).
- Kernel: `lucad87/laya-triage-train` (Kaggle, version 6 in corso); CI: `.github/workflows/e2e-triage.yml` (job: e2e, triage, collect-corpus, trained-eval).
- Builders/patchers in `C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\` (`build-kernel-v2.cjs`, `patch-kernel-v3.cjs`, `patch-kernel-v4.cjs`, analisi).
- Il blog (`lucad87/qa-blog`) NON si tocca.
- Questo file + `finetune/RESULTS.md` (confronto run #2) = commit da fare a fine eval.
