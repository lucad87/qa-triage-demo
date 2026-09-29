# NEXT-STEPS — qa-triage-demo

Aggiornato: 2026-09-29 sera (eval run #2 **fp32** COMPLETATA — numeri veri in `finetune/RESULTS.md`).

## Stato attuale

- Corpus: **43 scenari / 77 stati** etichettati; dataset fine-tune 77 righe (67 train / 10 val).
- Kernel v6 (`lucad87/laya-triage-train`): training 8 epoche, val **0.775** (n=10, rumorosa), export **fp32 + int8** (entrambi nell'output).
- **Eval CI run #2 (`36549725712`, fp32, 77 stati): 31/77 auto, 31/31 corrette — precisione 100%, coverage 0.40**; origin 66/77 (86%): product 39/39, test 22/24, env 5/10, flake 0/4; 46 astensioni. Report: `runs/eval-report-tuned-2.md|json`.
- Workflow `trained-eval` **pinnato a fp32** (commit `a26a8c5`) — vedi INT8 sotto.
- Ultimi commit su main: `a26a8c5` (fix fp32) → poi commit dei risultati run #2.

## INT8 — cronaca (parked, non rimosso)

Successi parziali e tranello finale:
1. Ricetta che **produce un int8 che si carica e gira**: merge external data → `quant_pre_process(skip_symbolic_shape=True)` → **strip `graph.value_info`** (fix del conflitto ORT "1028 vs 256") → `quantize_dynamic(QInt8)` → 425 MB.
2. **Ma su input reali le uscite sono appiattite**: probabilità ≈0.25 uniformi, conf ≈0.0002 (fp32 sugli stessi stati: conf 0.30–0.85, origin corretto). La quantizzazione dinamica distrugge il modello per questo dominio.
3. Il check in-kernel ha fatto **falso positivo**: confronto su input random saturo (`[[1.0, 0.0], …]`, diff 0.0) — non diagnostico.
4. Conseguenza: una eval è stata girata sull'int8 rotto (risultato fake "0/77 auto") → il workflow ora usa **fp32** e l'int8 resta solo come artefatto documentato.

Futuro (se si vuole riprovare): validazione su **input reali** baked nel kernel (2–3 stati del corpus, confronto distribuzioni vs fp32), poi opzioni tipo escludere op problematiche / per-channel / versioni ORT diverse.

## Prossimo lavoro

1. **Articolo** (`D:\openwork\posts\playwright-failure-triage-draft.md`): integrare i risultati run #2 (tabella routing + breakdown origin), la cronaca INT8 ("gira ma flatlina; il check saturo diceva OK"), e sostituire la sezione "What's next: the data loop" con i risultati reali del loop.
2. Publish prep: rendere pubblico il repo quando l'articolo esce (aggiornare link, figure: pipeline, tabella routing).
3. Opzionali: espandere corpus (flake 3, env 3 sono sotto-rappresentati — classi deboli), indagare perché `test_side` resta sotto la soglia 0.75 nonostante l'origin corretto, parità template/truncation training↔runtime.
4. **Rigenerare il token Kaggle a fine progetto** (passato in chat).

## Numeri chiave (per riferimenti rapidi)

- Run #1 routing (CI): origin 19/42 (45%), tutti escalate, conf ∼0.05.
- Run #2 routing (CI, fp32): auto 31/77 (precision 100%), coverage 0.40, origin 66/77 (86%).
- Val in-kernel: 0.55 → 0.60 → 0.775 (tre run di training, stessa config, n=10).
- Zero-shot: `runs/eval-report.md`; gate ingenuo: `runs/eval-report-v0.md`; fine-tune #1: `runs/eval-report-tuned.md`.

## Note operative

- Token Kaggle: `%USERPROFILE%\.kaggle\kaggle.json` + env `KAGGLE_API_TOKEN` (persistita) + secret repo `KAGGLE_API_TOKEN`; su Windows `$env:PYTHONUTF8=1` per la CLI.
- Chiave DeepSeek in env (`LPR_AMXVA_DEEPSEEK_API_KEY`).
- Kernel: `lucad87/laya-triage-train` (Kaggle); CI: `.github/workflows/e2e-triage.yml` (job: e2e, triage, collect-corpus, trained-eval).
- Builders/patchers: `C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\` (`build-kernel-v2.cjs`, `patch-kernel-v3/v4.cjs`, `int8-experiment*.py`).
- Bundle locali: fp32 run-#1 in `...\kaggle-triage\output\onnx_fp32`; bundle v6 in `...\kaggle-triage\v6-out\{onnx_fp32,onnx_int8}`; eval artifacts: `ci-eval-v6-fp32\`.
- ⚠️ Il concurrency group di `e2e-triage.yml` cancella i run in corso: **mai pushare/dispatchare mentre `trained-eval` gira**.
- Il blog (`lucad87/qa-blog`) NON si tocca.
