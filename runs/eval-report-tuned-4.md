# QA triage evaluation

- Generated: 2026-09-29T13:39:08.341Z
- Runs dir: `/home/runner/work/qa-triage-demo/qa-triage-demo/runs`
- Run dirs scanned: 51 (usable: 50)
- Skipped run dirs: baseline=1

## Summary

**Overall**

| total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 92 | 77 | 77 | 0 | 15 | 1.00 | 0.84 |

**By class**

| class | expected | total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| test | test-fix | 24 | 11 | 11 | 0 | 13 | 1.00 | 0.46 |
| product | product-report | 39 | 39 | 39 | 0 | 0 | 1.00 | 1.00 |
| flake | flake-tracker | 7 | 5 | 5 | 0 | 2 | 1.00 | 0.71 |
| environment | env-alert | 22 | 22 | 22 | 0 | 0 | 1.00 | 1.00 |

## Detail

| scenario | state | test | expected | predicted | correct | origin | conf | test_side | product_side |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| env-dns-unresolvable | state-01.json | empty board shows the empty state | env-alert | env-alert | yes | environment | 0.85 | 0.19 | 0.04 |
| env-dns-unresolvable | state-02.json | creating a task shows it in the list and updates the counter | env-alert | env-alert | yes | environment | 0.84 | 0.14 | 0.05 |
| env-dns-unresolvable | state-03.json | completing a task updates the counter and the Done filter | env-alert | env-alert | yes | environment | 0.79 | 0.16 | 0.04 |
| env-dns-unresolvable | state-04.json | blank tasks are ignored | env-alert | env-alert | yes | environment | 0.74 | 0.23 | 0.05 |
| env-https-baseurl | state-01.json | empty board shows the empty state | env-alert | env-alert | yes | environment | 0.85 | 0.13 | 0.04 |
| env-https-baseurl | state-02.json | creating a task shows it in the list and updates the counter | env-alert | env-alert | yes | environment | 0.85 | 0.13 | 0.07 |
| env-https-baseurl | state-03.json | completing a task updates the counter and the Done filter | env-alert | env-alert | yes | environment | 0.68 | 0.13 | 0.05 |
| env-https-baseurl | state-04.json | blank tasks are ignored | env-alert | env-alert | yes | environment | 0.81 | 0.21 | 0.06 |
| env-nav-timeout | state-01.json | empty board shows the empty state | env-alert | env-alert | yes | environment | 0.84 | 0.12 | 0.02 |
| env-nav-timeout | state-02.json | creating a task shows it in the list and updates the counter | env-alert | env-alert | yes | environment | 0.74 | 0.20 | 0.06 |
| env-nav-timeout | state-03.json | completing a task updates the counter and the Done filter | env-alert | env-alert | yes | environment | 0.77 | 0.15 | 0.04 |
| env-nav-timeout | state-04.json | blank tasks are ignored | env-alert | env-alert | yes | environment | 0.75 | 0.22 | 0.03 |
| env-parallel-workers | state-01.json | creating a task shows it in the list and updates the counter | env-alert | env-alert | yes | environment | 0.76 | 0.21 | 0.06 |
| env-parallel-workers | state-02.json | completing a task updates the counter and the Done filter | env-alert | env-alert | yes | environment | 0.58 | 0.18 | 0.05 |
| env-storage-missing | state-01.json | empty board shows the empty state | env-alert | env-alert | yes | environment | 0.84 | 0.11 | 0.03 |
| env-storage-missing | state-02.json | creating a task shows it in the list and updates the counter | env-alert | env-alert | yes | environment | 0.81 | 0.11 | 0.05 |
| env-storage-missing | state-03.json | completing a task updates the counter and the Done filter | env-alert | env-alert | yes | environment | 0.73 | 0.14 | 0.04 |
| env-storage-missing | state-04.json | blank tasks are ignored | env-alert | env-alert | yes | environment | 0.72 | 0.19 | 0.04 |
| env-wrong-baseurl | state-01.json | empty board shows the empty state | env-alert | env-alert | yes | environment | 0.83 | 0.22 | 0.04 |
| env-wrong-baseurl | state-02.json | creating a task shows it in the list and updates the counter | env-alert | env-alert | yes | environment | 0.80 | 0.15 | 0.05 |
| env-wrong-baseurl | state-03.json | completing a task updates the counter and the Done filter | env-alert | env-alert | yes | environment | 0.77 | 0.18 | 0.05 |
| env-wrong-baseurl | state-04.json | blank tasks are ignored | env-alert | env-alert | yes | environment | 0.79 | 0.23 | 0.04 |
| flake-evidence | state-01.json | blank tasks are ignored | flake-tracker | escalate | - | flake | 0.14 | 0.29 | 0.22 |
| flake-random-create-corrupt | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | flake-tracker | yes | flake | 0.37 | 0.29 | 0.13 |
| flake-random-get-empty | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | flake-tracker | yes | flake | 0.44 | 0.20 | 0.39 |
| flake-random-patch-500 | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | flake-tracker | yes | flake | 0.42 | 0.24 | 0.14 |
| flake-random-post-500 | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | flake-tracker | yes | flake | 0.44 | 0.24 | 0.13 |
| flake-random-refresh | state-01.json | empty board shows the empty state | flake-tracker | escalate | - | test | 0.04 | 0.32 | 0.28 |
| flake-toggle-random-skip | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | flake-tracker | yes | flake | 0.36 | 0.15 | 0.78 |
| product-add-no-refresh | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.78 | 0.10 | 0.93 |
| product-add-no-refresh | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.73 | 0.11 | 0.91 |
| product-checkbox-disabled | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.45 | 0.28 | 0.81 |
| product-counter-counts-all | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.72 | 0.11 | 0.91 |
| product-counter-counts-done | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.72 | 0.09 | 0.93 |
| product-counter-counts-done | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.78 | 0.10 | 0.93 |
| product-counter-plus-one | state-01.json | empty board shows the empty state | product-report | product-report | yes | product | 0.73 | 0.11 | 0.92 |
| product-counter-plus-one | state-02.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.77 | 0.09 | 0.94 |
| product-counter-plus-one | state-03.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.79 | 0.09 | 0.92 |
| product-counter-plus-one | state-04.json | blank tasks are ignored | product-report | product-report | yes | product | 0.57 | 0.13 | 0.89 |
| product-create-api-500 | state-01.json | empty board shows the empty state | product-report | product-report | yes | product | 0.36 | 0.26 | 0.66 |
| product-create-api-500 | state-02.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.61 | 0.14 | 0.86 |
| product-create-api-500 | state-03.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.64 | 0.15 | 0.81 |
| product-create-duplicates | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.69 | 0.09 | 0.94 |
| product-create-duplicates | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.70 | 0.10 | 0.92 |
| product-create-not-stored | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.74 | 0.08 | 0.94 |
| product-create-not-stored | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.75 | 0.09 | 0.94 |
| product-done-button-removed | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.58 | 0.14 | 0.90 |
| product-done-filter-inverted | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.72 | 0.11 | 0.91 |
| product-double-submit | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.73 | 0.11 | 0.90 |
| product-double-submit | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.53 | 0.15 | 0.81 |
| product-empty-state-inverted | state-01.json | empty board shows the empty state | product-report | product-report | yes | product | 0.72 | 0.11 | 0.88 |
| product-empty-state-inverted | state-02.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.78 | 0.09 | 0.94 |
| product-empty-state-inverted | state-03.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.72 | 0.10 | 0.92 |
| product-empty-state-inverted | state-04.json | blank tasks are ignored | product-report | product-report | yes | product | 0.58 | 0.13 | 0.90 |
| product-empty-state-missing | state-01.json | empty board shows the empty state | product-report | product-report | yes | product | 0.53 | 0.18 | 0.78 |
| product-empty-state-missing | state-02.json | blank tasks are ignored | product-report | product-report | yes | product | 0.56 | 0.17 | 0.80 |
| product-get-drops-last-task | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.54 | 0.10 | 0.93 |
| product-get-drops-last-task | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.56 | 0.11 | 0.91 |
| product-post-hang | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.71 | 0.12 | 0.87 |
| product-post-hang | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.56 | 0.15 | 0.81 |
| product-render-object | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.77 | 0.09 | 0.94 |
| product-render-object | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.70 | 0.11 | 0.90 |
| product-title-overwritten | state-01.json | creating a task shows it in the list and updates the counter | product-report | product-report | yes | product | 0.71 | 0.08 | 0.94 |
| product-title-overwritten | state-02.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.54 | 0.11 | 0.91 |
| product-toggle-by-index | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.74 | 0.10 | 0.93 |
| product-toggle-no-refresh | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.67 | 0.15 | 0.86 |
| product-toggle-not-persisted | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.67 | 0.09 | 0.93 |
| product-toggle-wrong-key | state-01.json | completing a task updates the counter and the Done filter | product-report | product-report | yes | product | 0.70 | 0.13 | 0.91 |
| test-add-button-renamed | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.61 | 0.54 | 0.13 |
| test-add-button-renamed | state-02.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.59 | 0.55 | 0.12 |
| test-add-button-renamed | state-03.json | blank tasks are ignored | test-fix | escalate | - | test | 0.63 | 0.55 | 0.10 |
| test-bang-copy-expectation | state-01.json | creating a task shows it in the list and updates the counter | test-fix | test-fix | yes | test | 0.62 | 0.69 | 0.07 |
| test-checkbox-name-stale | state-01.json | completing a task updates the counter and the Done filter | test-fix | test-fix | yes | test | 0.64 | 0.75 | 0.08 |
| test-counter-testid-typo | state-01.json | creating a task shows it in the list and updates the counter | test-fix | test-fix | yes | test | 0.67 | 0.68 | 0.09 |
| test-done-button-renamed | state-01.json | completing a task updates the counter and the Done filter | test-fix | test-fix | yes | test | 0.66 | 0.73 | 0.07 |
| test-extra-list-expectation | state-01.json | blank tasks are ignored | test-fix | test-fix | yes | test | 0.69 | 0.69 | 0.04 |
| test-heading-text-stale | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.52 | 0.62 | 0.09 |
| test-removed-reset | state-01.json | completing a task updates the counter and the Done filter | test-fix | test-fix | yes | test | 0.61 | 0.68 | 0.06 |
| test-removed-reset | state-02.json | blank tasks are ignored | test-fix | escalate | - | test | 0.46 | 0.64 | 0.08 |
| test-renamed-label-drift | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.28 | 0.36 | 0.67 |
| test-renamed-label-drift | state-02.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | product | 0.40 | 0.31 | 0.63 |
| test-renamed-label-drift | state-03.json | blank tasks are ignored | test-fix | escalate | - | test | 0.32 | 0.42 | 0.21 |
| test-stale-empty-copy | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.55 | 0.63 | 0.05 |
| test-stale-fill-string | state-01.json | completing a task updates the counter and the Done filter | test-fix | test-fix | yes | test | 0.68 | 0.73 | 0.07 |
| test-stale-format | state-01.json | empty board shows the empty state | test-fix | test-fix | yes | test | 0.70 | 0.65 | 0.06 |
| test-stale-task-fixture | state-01.json | creating a task shows it in the list and updates the counter | test-fix | test-fix | yes | test | 0.62 | 0.68 | 0.11 |
| test-wrong-count-expectation | state-01.json | empty board shows the empty state | test-fix | test-fix | yes | test | 0.69 | 0.66 | 0.06 |
| test-wrong-expected-count | state-01.json | creating a task shows it in the list and updates the counter | test-fix | test-fix | yes | test | 0.66 | 0.70 | 0.08 |
| test-wrong-route | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.60 | 0.53 | 0.11 |
| test-wrong-route | state-02.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.53 | 0.57 | 0.09 |
| test-wrong-route | state-03.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.54 | 0.55 | 0.10 |
| test-wrong-route | state-04.json | blank tasks are ignored | test-fix | escalate | - | test | 0.55 | 0.60 | 0.09 |

