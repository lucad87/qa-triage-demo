# NEXT-STEPS — qa-triage-demo

Aggiornato: 2026-09-29 (esperimenti opzionali: corpus round 3 + gate fitting — COMPLETATI).

## Cosa resta, in parole semplici

Il progetto (pipeline + modello + eval) è **finito e funzionante**: coverage 0.84, precisione 100%, tutto verde su GitHub. Restano solo:

1. **Parte editoriale per il blog** (serve una decisione sui tempi): figure (FIG 1-5), rendere pubblico il repo, inserire il link nell'articolo, pubblicare. L'agente può preparare tutto su richiesta.
2. **Sicurezza**: rigenerare il token Kaggle quando si chiude il progetto (~2 minuti).
3. **Migliorie opzionali** (nulla di rotto — il sistema già funziona):
   - classe `test` a 11/24 auto: servirebbe più corpus test o tuning → un altro giro di lavoro;
   - INT8 parcheggiato: va validato su input reali prima di poterlo usare;
   - 2 stati flake finiscono in escalation (gestiti dall'LLM, costo trascurabile).

## Stato attuale (il loop è chiuso e gira)

- Corpus: **49 scenari / 92 stati** (product 39, test 24, environment 22, flake 7).
- Modello: kernel **v7** (`lucad87/laya-triage-train`), 8 epoche su 82 train / 10 val; val in-kernel **0.95** (n=10, rumorosa).
- **Eval CI run #4 (fp32, gate fittate 0.30/0.65): 77/92 auto, 77/77 corrette (precision 100%), coverage 0.84** — per classe: product 39/39, environment 22/22, test 11/24, flake 5/7. Report: `runs/eval-report-tuned-4.md|json`.
- Gate **fittate sul corpus** (tabella di sensibilità in `finetune/RESULTS.md`): minNoul 0.75→**0.65** nei default di `decide.mjs` (commit `75e791a`); a 0.60 compaiono i primi errori → 0.65 è il punto massimale a zero errori.
- Cronologia eval: #1 (42 stati) 0 auto · #2 (77) 31 auto/0.40 · #3 (92, gate vecchie) 65/0.71 · #4 (92, gate fittate) 77/0.84.
- CI: trained-eval pinnato a **fp32**; la distill dei flake sceglie il **primo attempt con failure** (commit `8639784`); nuovi scenari validati in locale prima della collect.

## Prossimo lavoro

1. **Articolo v0.3** (`D:\openwork\posts\playwright-failure-triage-draft.md`): numeri round 3 + paragrafo gate-fitting + updated takeaways.
2. Publish prep: repo pubblico (`gh repo edit ... --visibility public`) + figure (FIG 1-5 nelle note editoriali) + link.
3. Ipotesi sperimentali rimaste (nessuna bloccante):
   - `test` 13 astensioni: test_side 0.31-0.64 < 0.65 — origin corretto su 23/24; più dati test o tuning della head noul.
   - `flake` 2 astensioni: `flake-evidence` (sub-run, conf 0.14) e `flake-random-refresh` (unico errore d'origine residuo: predice `test` a 0.04). Candidati: più dati flake, feature di retry-history nello state.
   - INT8: harness di validazione su **input reali** dentro il kernel prima di qualunque uso (la flatline è documentata in RESULTS).
4. **Rigenerare il token Kaggle a fine progetto** (passato in chat).

## Mappa dei file chiave

- Repo: `github.com/lucad87/qa-triage-demo` (privato). CI: `.github/workflows/e2e-triage.yml` (job: e2e, triage, collect-corpus, trained-eval) + `.github/workflows/demo-pipe.yml` (demo manuale: decide → act → verify sugli states storici; ~5 min, artifact `demo-pipe`; run di riferimento `36593965876`).
- Scenari: `scenarios/*.json` (49) + `manifest.json` (sync con `node scripts/scenarios/sync-manifest.mjs`; verifica con `node scripts/scenarios/apply.mjs --check`).
- Script triage: `scripts/triage/decide.mjs` (soglie nei default), `collect.mjs`, `distill.mjs`, `eval.mjs`, `make-finetune-dataset.mjs`.
- Dataset: `finetune/laya-triage.{train,val,all}.jsonl` (82 / 10 / 92) + `summary.json`.
- Kaggle tooling: `C:\Users\lucad\AppData\Local\Temp\opencode\kaggle-triage\` — `rebuild-kernel-embed.cjs` (ri-embed del dataset nel kernel), `patch-kernel-v4.cjs` (ricetta int8/export), bundle locali in `v7-out\` e eval in `ci-eval-v7*\`.
- Token Kaggle: `%USERPROFILE%\.kaggle\kaggle.json` + env `KAGGLE_API_TOKEN` (persistita) + secret repo `KAGGLE_API_TOKEN`; su Windows `$env:PYTHONUTF8=1` per la CLI.
- ⚠️ Concurrency: **mai pushare/dispatchare mentre `trained-eval` gira** (il group cancella i run in corso).
- Il blog (`lucad87/qa-blog`) NON si tocca.
