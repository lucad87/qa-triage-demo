# QA triage evaluation

- Generated: 2026-09-29T10:06:23.570Z
- Runs dir: `/home/runner/work/qa-triage-demo/qa-triage-demo/runs`
- Run dirs scanned: 45 (usable: 44)
- Skipped run dirs: baseline=1

## Summary

**Overall**

| total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 77 | 31 | 31 | 0 | 46 | 1.00 | 0.40 |

**By class**

| class | expected | total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| test | test-fix | 24 | 0 | 0 | 0 | 24 | n/a | 0.00 |
| product | product-report | 39 | 31 | 31 | 0 | 8 | 1.00 | 0.79 |
| flake | flake-tracker | 4 | 0 | 0 | 0 | 4 | n/a | 0.00 |
| environment | env-alert | 10 | 0 | 0 | 0 | 10 | n/a | 0.00 |

## Detail

| scenario | state | test | expected | predicted | correct | origin | conf | test_side | product_side |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| env-https-baseurl | state-01.json | empty board shows the empty state | env-alert | escalate | - | environment | 0.06 | 0.19 | 0.20 |
| env-https-baseurl | state-02.json | creating a task shows it in the list and updates the counter | env-alert | escalate | - | environment | 0.08 | 0.18 | 0.26 |
| env-https-baseurl | state-03.json | completing a task updates the counter and the Done filter | env-alert | escalate | - | product | 0.08 | 0.20 | 0.32 |
| env-https-baseurl | state-04.json | blank tasks are ignored | env-alert | escalate | - | environment | 0.04 | 0.23 | 0.19 |
| env-parallel-workers | state-01.json | creating a task shows it in the list and updates the counter | env-alert | escalate | - | product | 0.03 | 0.24 | 0.26 |
| env-parallel-workers | state-02.json | completing a task updates the counter and the Done filter | env-alert | escalate | - | test | 0.06 | 0.20 | 0.29 |
| env-wrong-baseurl | state-01.json | empty board shows the empty state | env-alert | escalate | - | environment | 0.07 | 0.20 | 0.19 |
| env-wrong-baseurl | state-02.json | creating a task shows it in the list and updates the counter | env-alert | escalate | - | test | 0.08 | 0.25 | 0.24 |
| env-wrong-baseurl | state-03.json | completing a task updates the counter and the Done filter | env-alert | escalate | - | product | 0.09 | 0.24 | 0.34 |
| env-wrong-baseurl | state-04.json | blank tasks are ignored | env-alert | escalate | - | environment | 0.04 | 0.23 | 0.22 |
| flake-evidence | state-01.json | blank tasks are ignored | flake-tracker | escalate | - | product | 0.09 | 0.25 | 0.29 |
| flake-random-post-500 | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | escalate | - | product | 0.31 | 0.19 | 0.52 |
| flake-random-refresh | state-01.json | empty board shows the empty state | flake-tracker | escalate | - | product | 0.18 | 0.22 | 0.30 |
| flake-toggle-random-skip | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | escalate | - | product | 0.50 | 0.19 | 0.55 |
| product-add-no-refresh | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.76 | 0.15 | 0.95 |
| product-add-no-refresh | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.77 | 0.14 | 0.94 |
| product-checkbox-disabled | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.43 | 0.24 | 0.59 |
| product-counter-counts-all | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.61 | 0.22 | 0.87 |
| product-counter-counts-done | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.71 | 0.14 | 0.93 |
| product-counter-counts-done | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.69 | 0.23 | 0.91 |
| product-counter-plus-one | state-01.json | empty board shows the empty state | product-report | product-report | yes | product | 0.69 | 0.16 | 0.94 |
| product-counter-plus-one | state-02.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.83 | 0.10 | 0.97 |
| product-counter-plus-one | state-03.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.85 | 0.12 | 0.96 |
| product-counter-plus-one | state-04.json | blank tasks are ignored | product-report | product-report | yes | product | 0.72 | 0.17 | 0.95 |
| product-create-api-500 | state-01.json | empty board shows the empty state | product-report | escalate | - | product | 0.21 | 0.23 | 0.36 |
| product-create-api-500 | state-02.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.55 | 0.20 | 0.91 |
| product-create-api-500 | state-03.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.52 | 0.20 | 0.65 |
| product-create-duplicates | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.61 | 0.17 | 0.91 |
| product-create-duplicates | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.53 | 0.20 | 0.78 |
| product-create-not-stored | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.60 | 0.16 | 0.95 |
| product-create-not-stored | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.61 | 0.15 | 0.94 |
| product-done-button-removed | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.73 | 0.19 | 0.94 |
| product-done-filter-inverted | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.73 | 0.16 | 0.91 |
| product-double-submit | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.69 | 0.13 | 0.87 |
| product-double-submit | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.65 | 0.15 | 0.88 |
| product-empty-state-inverted | state-01.json | empty board shows the empty state | product-report | product-report | yes | product | 0.66 | 0.15 | 0.85 |
| product-empty-state-inverted | state-02.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.81 | 0.11 | 0.97 |
| product-empty-state-inverted | state-03.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.78 | 0.12 | 0.95 |
| product-empty-state-inverted | state-04.json | blank tasks are ignored | product-report | product-report | yes | product | 0.66 | 0.16 | 0.85 |
| product-empty-state-missing | state-01.json | empty board shows the empty state | product-report | escalate | - | product | 0.39 | 0.21 | 0.42 |
| product-empty-state-missing | state-02.json | blank tasks are ignored | product-report | escalate | - | product | 0.48 | 0.22 | 0.41 |
| product-get-drops-last-task | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.44 | 0.16 | 0.91 |
| product-get-drops-last-task | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.42 | 0.18 | 0.84 |
| product-post-hang | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.66 | 0.17 | 0.93 |
| product-post-hang | state-02.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.54 | 0.19 | 0.74 |
| product-render-object | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.80 | 0.14 | 0.96 |
| product-render-object | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.79 | 0.13 | 0.94 |
| product-title-overwritten | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.51 | 0.16 | 0.96 |
| product-title-overwritten | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.51 | 0.13 | 0.91 |
| product-toggle-by-index | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.80 | 0.13 | 0.94 |
| product-toggle-no-refresh | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.64 | 0.17 | 0.65 |
| product-toggle-not-persisted | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.43 | 0.23 | 0.85 |
| product-toggle-wrong-key | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.48 | 0.23 | 0.67 |
| test-add-button-renamed | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.37 | 0.41 | 0.28 |
| test-add-button-renamed | state-02.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.42 | 0.36 | 0.29 |
| test-add-button-renamed | state-03.json | blank tasks are ignored | test-fix | escalate | - | test | 0.32 | 0.45 | 0.21 |
| test-bang-copy-expectation | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.39 | 0.35 | 0.31 |
| test-checkbox-name-stale | state-01.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.37 | 0.30 | 0.39 |
| test-counter-testid-typo | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.41 | 0.34 | 0.31 |
| test-done-button-renamed | state-01.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.39 | 0.28 | 0.45 |
| test-extra-list-expectation | state-01.json | blank tasks are ignored | test-fix | escalate | - | test | 0.37 | 0.39 | 0.24 |
| test-heading-text-stale | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.36 | 0.37 | 0.26 |
| test-removed-reset | state-01.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.32 | 0.32 | 0.35 |
| test-removed-reset | state-02.json | blank tasks are ignored | test-fix | escalate | - | test | 0.30 | 0.31 | 0.32 |
| test-renamed-label-drift | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.56 | 0.21 | 0.63 |
| test-renamed-label-drift | state-02.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | product | 0.51 | 0.20 | 0.69 |
| test-renamed-label-drift | state-03.json | blank tasks are ignored | test-fix | escalate | - | test | 0.34 | 0.24 | 0.33 |
| test-stale-empty-copy | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.36 | 0.39 | 0.24 |
| test-stale-fill-string | state-01.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.40 | 0.27 | 0.41 |
| test-stale-format | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.49 | 0.36 | 0.21 |
| test-stale-task-fixture | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.39 | 0.34 | 0.32 |
| test-wrong-count-expectation | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.48 | 0.36 | 0.21 |
| test-wrong-expected-count | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.42 | 0.33 | 0.30 |
| test-wrong-route | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.34 | 0.41 | 0.22 |
| test-wrong-route | state-02.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.30 | 0.36 | 0.34 |
| test-wrong-route | state-03.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.32 | 0.39 | 0.35 |
| test-wrong-route | state-04.json | blank tasks are ignored | test-fix | escalate | - | test | 0.35 | 0.41 | 0.24 |

