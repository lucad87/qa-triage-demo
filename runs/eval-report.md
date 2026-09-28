# QA triage evaluation

- Generated: 2026-09-28T18:17:37.737Z
- Runs dir: `D:\openwork\qa-triage-demo\runs`
- Run dirs scanned: 10 (usable: 9)
- Skipped run dirs: baseline=1

## Summary

**Overall**

| total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 17 | 0 | 0 | 0 | 17 | n/a | 0.00 |

**By class**

| class | expected | total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| test | test-fix | 4 | 0 | 0 | 0 | 4 | n/a | 0.00 |
| product | product-report | 8 | 0 | 0 | 0 | 8 | n/a | 0.00 |
| flake | flake-tracker | 1 | 0 | 0 | 0 | 1 | n/a | 0.00 |
| environment | env-alert | 4 | 0 | 0 | 0 | 4 | n/a | 0.00 |

## Detail

| scenario | state | test | expected | predicted | correct | origin | conf | test_side | product_side |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| env-wrong-baseurl | state-01.json | empty board shows the empty state | env-alert | escalate | - | flake | 0.05 | 0.88 | 0.70 |
| env-wrong-baseurl | state-02.json | creating a task shows it in the list and updates the counter | env-alert | escalate | - | test | 0.04 | 0.93 | 0.76 |
| env-wrong-baseurl | state-03.json | completing a task updates the counter and the Done filter | env-alert | escalate | - | test | 0.04 | 0.93 | 0.72 |
| env-wrong-baseurl | state-04.json | blank tasks are ignored | env-alert | escalate | - | flake | 0.04 | 0.94 | 0.84 |
| flake-random-refresh | state-01.json | empty board shows the empty state | flake-tracker | escalate | - | test | 0.04 | 0.85 | 0.84 |
| product-counter-counts-all | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | test | 0.07 | 0.93 | 0.84 |
| product-create-api-500 | state-01.json | empty board shows the empty state | product-report | escalate | - | test | 0.05 | 0.83 | 0.76 |
| product-create-api-500 | state-02.json | creating a task shows it in the list and updates the counter | product-report | escalate | - | test | 0.02 | 0.89 | 0.86 |
| product-create-api-500 | state-03.json | completing a task updates the counter and the Done filter | product-report | escalate | - | test | 0.06 | 0.90 | 0.73 |
| product-done-filter-inverted | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | test | 0.06 | 0.92 | 0.78 |
| product-empty-state-missing | state-01.json | empty board shows the empty state | product-report | escalate | - | test | 0.06 | 0.90 | 0.81 |
| product-empty-state-missing | state-02.json | blank tasks are ignored | product-report | escalate | - | test | 0.07 | 0.92 | 0.85 |
| product-toggle-not-persisted | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | test | 0.07 | 0.94 | 0.76 |
| test-renamed-label-drift | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.06 | 0.86 | 0.72 |
| test-renamed-label-drift | state-02.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | flake | 0.05 | 0.95 | 0.70 |
| test-renamed-label-drift | state-03.json | blank tasks are ignored | test-fix | escalate | - | test | 0.06 | 0.94 | 0.81 |
| test-wrong-expected-count | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | test | 0.07 | 0.97 | 0.65 |

