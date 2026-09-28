# NEXT-STEPS — qa-triage-demo

Aggiornato: 2026-09-28 (sessione in corso). Questo file è il piano di lavoro della demo per l'articolo.

## Contesto (in una riga)
Dimostrazione per l'articolo su blog.lucad.cloud: Playwright in CI + **Laya** (decision model CPU/ONNX) + **LLM (DeepSeek)** per triare i fallimenti: fix del test (proposta verificata) quando è il test, bug report quando è il prodotto.

## Fatto ✓
- Demo app **TaskDeck** (Next.js + TS) + suite Playwright baseline verde (4/4).
- **Corpus**: baseline + 9 scenari in `scenarios/`; raccolta completa in `runs/` (+ `runs/flake-evidence`).
- **Pipeline**: `scripts/triage/{collect,distill,decide,act,eval,verify}.mjs` + `scripts/scenarios/apply.mjs` + `_ablate.mjs` (esperimento).
- **Step 1+2**: gate onesto (soglia su tutte le route) + input v2 (diff, testSource, errore pulito) + troncamento quantificato (max_len 512/domanda) + ablazione (anche il digest perfetto resta sotto soglia → limite = modello base). Laya zero-shot: 17/17 astensioni, 0 errori.
- **Step 4 — live con LLM (DeepSeek)** ✓ (dettagli sotto).
- Skill `parallel-agents` in `D:\openwork\.opencode\skills\`.

## Step 4 — risultati (2026-09-28, live)
- **18 stati processati, 0 errori**; **deep-triage LLM vs ground truth: 16/17** (94%):
  - test 4/4 ✓ · product 8/8 ✓ · environment 4/4 ✓ · **flake 0/1** ← disaccordo difendibile: la randomness iniettata è nel codice app (`Math.random() < 0.5`); l'LLM la legge come regressione di prodotto e spiega esplicitamente che il retry-passed non è flakiness del test. Il nostro label dice flake → caso di scuola per l'ambiguità della tassonomia (da raccontare onestamente nell'articolo).
- **Patch test generate e VERIFICATE** con `verify.mjs` (ri-esecuzione dello spec):
  - `test-renamed-label-drift` → fix del locator in tutti e 3 i test → **PASS** (scenario applicato);
  - `test-wrong-expected-count` → candidato = spec corrente (il fix è ripristinare l'asserzione pre-guasto) → **PASS** (senza scenario); rationale LLM con prosa confusa ma artefatto corretto → esempio del perché PR + revisione umana.
- **Bug report prodotto**: 10 generati (es. "counter" = qualità pubblicabile: riproduzione, evidenza citata, causa dal diff, fix suggerito).
- **Env alert**: `runs/env-wrong-baseurl/actions/env-alerts.md` (4 sezioni, ECONNREFUSED su 3999 dal diff di config).
- **Registro flake**: `flakes.jsonl` mai scritto — nessuno stato classificato flake (vedi sopra). Nota: la flakiness va riconosciuta dallo storico dei retry, non dal singolo fallimento.
- Artefatti in `runs/*/actions/` (manifest + triage json + report/candidate/rationale).

## Da fare dopo (in ordine di decisione)
3. **(Opzionale) Fine-tune di Laya** — decisione col proprietario, con lo Step 4 in mano: la pipeline funziona end-to-end col LLM; il fine-tune sposterebbe volume sul modello locale (costo/latenza). Serve GPU (Kaggle 2×T4 o RTX 3070) + espansione del corpus.
5. **CI (GitHub Actions)**: job Playwright → job triage (distill → decide → act). Cache ONNX o `modelDir`.
6. **Articolo EN** per blog.lucad.cloud: bozza + diagrammi + numeri reali (v0 1/17 → gate 0 automatiche/17 astensioni → LLM 16/17) + sezione ablation + casi (drift fix verificato, bug report, divergenza flake) + link repo demo.
7. **Rifiniture**: fix cosmetico `classifyResults` in `collect.mjs`; estendere `verify.mjs` per scenari che editano lo spec (oggi: usarlo senza `--scenario`); `git init` + remote GitHub; pulizia file interni (`NEXT-STEPS.md`, `_ablate.mjs`) prima della pubblicazione.

## Note operative
- Chiave DeepSeek in env (`LPR_AMXVA_DEEPSEEK_API_KEY`); Step 4 ≈ decine di chiamate, costo pochi centesimi.
- `@receptron/laya` 0.1.2; config: max_len 512/domanda, head_max_len 192, temperature calibrate.
- Il blog (`lucad87/qa-blog`) NON si tocca.
