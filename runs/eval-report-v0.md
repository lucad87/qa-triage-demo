# QA triage evaluation

- Generated: 2026-09-28T18:02:05.396Z
- Runs dir: `D:\openwork\qa-triage-demo\runs`
- Run dirs scanned: 10 (usable: 9)
- Skipped run dirs: baseline=1

## Summary

**Overall**

| total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 17 | 14 | 1 | 13 | 3 | 0.07 | 0.82 |

**By class**

| class | expected | total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| test | test-fix | 4 | 4 | 0 | 4 | 0 | 0.00 | 1.00 |
| product | product-report | 8 | 8 | 0 | 8 | 0 | 0.00 | 1.00 |
| flake | flake-tracker | 1 | 1 | 1 | 0 | 0 | 1.00 | 1.00 |
| environment | env-alert | 4 | 1 | 0 | 1 | 3 | 0.00 | 0.25 |

## Detail

| scenario | state | test | expected | predicted | correct | origin | conf | test_side | product_side |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| env-wrong-baseurl | state-01.json | empty board shows the empty state | env-alert | escalate | - | test | 0.02 | 1.00 | 0.50 |
| env-wrong-baseurl | state-02.json | creating a task shows it in the list and updates the counter | env-alert | escalate | - | test | 0.03 | 0.95 | 0.60 |
| env-wrong-baseurl | state-03.json | completing a task updates the counter and the Done filter | env-alert | flake-tracker | no | flake | 0.03 | 0.96 | 0.56 |
| env-wrong-baseurl | state-04.json | blank tasks are ignored | env-alert | escalate | - | test | 0.06 | 0.94 | 0.75 |
| flake-random-refresh | state-01.json | empty board shows the empty state | flake-tracker | flake-tracker | yes | flake | 0.07 | 0.90 | 0.58 |
| product-counter-counts-all | state-01.json | completing a task updates the counter and the Done filter | product-report | flake-tracker | no | flake | 0.05 | 0.95 | 0.78 |
| product-create-api-500 | state-01.json | empty board shows the empty state | product-report | flake-tracker | no | flake | 0.09 | 0.91 | 0.61 |
| product-create-api-500 | state-02.json | creating a task shows it in the list and updates the counter | product-report | flake-tracker | no | flake | 0.06 | 0.93 | 0.65 |
| product-create-api-500 | state-03.json | completing a task updates the counter and the Done filter | product-report | flake-tracker | no | flake | 0.04 | 0.96 | 0.85 |
| product-done-filter-inverted | state-01.json | completing a task updates the counter and the Done filter | product-report | flake-tracker | no | flake | 0.05 | 0.92 | 0.51 |
| product-empty-state-missing | state-01.json | empty board shows the empty state | product-report | flake-tracker | no | flake | 0.07 | 0.90 | 0.58 |
| product-empty-state-missing | state-02.json | blank tasks are ignored | product-report | flake-tracker | no | flake | 0.05 | 0.96 | 0.81 |
| product-toggle-not-persisted | state-01.json | completing a task updates the counter and the Done filter | product-report | flake-tracker | no | flake | 0.05 | 0.95 | 0.78 |
| test-renamed-label-drift | state-01.json | creating a task shows it in the list and updates the counter | test-fix | flake-tracker | no | flake | 0.08 | 0.94 | 0.73 |
| test-renamed-label-drift | state-02.json | completing a task updates the counter and the Done filter | test-fix | flake-tracker | no | flake | 0.07 | 0.93 | 0.74 |
| test-renamed-label-drift | state-03.json | blank tasks are ignored | test-fix | flake-tracker | no | flake | 0.05 | 0.96 | 0.59 |
| test-wrong-expected-count | state-01.json | creating a task shows it in the list and updates the counter | test-fix | flake-tracker | no | flake | 0.07 | 0.86 | 0.75 |

