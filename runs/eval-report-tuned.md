# QA triage evaluation

- Generated: 2026-09-28T21:07:49.932Z
- Runs dir: `/home/runner/work/qa-triage-demo/qa-triage-demo/runs`
- Run dirs scanned: 26 (usable: 25)
- Skipped run dirs: baseline=1

## Summary

**Overall**

| total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 42 | 0 | 0 | 0 | 42 | n/a | 0.00 |

**By class**

| class | expected | total | auto | correct | wrong | abstain | accuracy_on_auto | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| test | test-fix | 16 | 0 | 0 | 0 | 16 | n/a | 0.00 |
| product | product-report | 17 | 0 | 0 | 0 | 17 | n/a | 0.00 |
| flake | flake-tracker | 3 | 0 | 0 | 0 | 3 | n/a | 0.00 |
| environment | env-alert | 6 | 0 | 0 | 0 | 6 | n/a | 0.00 |

## Detail

| scenario | state | test | expected | predicted | correct | origin | conf | test_side | product_side |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| env-parallel-workers | state-01.json | creating a task shows it in the list and updates the counter | env-alert | escalate | - | product | 0.02 | 0.11 | 0.03 |
| env-parallel-workers | state-02.json | completing a task updates the counter and the Done filter | env-alert | escalate | - | test | 0.05 | 0.12 | 0.07 |
| env-wrong-baseurl | state-01.json | empty board shows the empty state | env-alert | escalate | - | product | 0.01 | 0.12 | 0.03 |
| env-wrong-baseurl | state-02.json | creating a task shows it in the list and updates the counter | env-alert | escalate | - | product | 0.03 | 0.11 | 0.03 |
| env-wrong-baseurl | state-03.json | completing a task updates the counter and the Done filter | env-alert | escalate | - | product | 0.04 | 0.16 | 0.08 |
| env-wrong-baseurl | state-04.json | blank tasks are ignored | env-alert | escalate | - | product | 0.02 | 0.13 | 0.04 |
| flake-evidence | state-01.json | blank tasks are ignored | flake-tracker | escalate | - | product | 0.03 | 0.16 | 0.07 |
| flake-random-refresh | state-01.json | empty board shows the empty state | flake-tracker | escalate | - | product | 0.01 | 0.18 | 0.08 |
| flake-toggle-random-skip | state-01.json | completing a task updates the counter and the Done filter | flake-tracker | escalate | - | product | 0.03 | 0.18 | 0.13 |
| product-checkbox-disabled | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.05 | 0.19 | 0.11 |
| product-counter-counts-all | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.07 | 0.19 | 0.10 |
| product-counter-counts-done | state-01.json | creating a task shows it in the list and updates the counter | product-report | escalate | - | product | 0.04 | 0.17 | 0.05 |
| product-counter-counts-done | state-02.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.06 | 0.19 | 0.10 |
| product-create-api-500 | state-01.json | empty board shows the empty state | product-report | escalate | - | product | 0.02 | 0.22 | 0.09 |
| product-create-api-500 | state-02.json | creating a task shows it in the list and updates the counter | product-report | escalate | - | product | 0.06 | 0.34 | 0.11 |
| product-create-api-500 | state-03.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.11 | 0.32 | 0.20 |
| product-create-duplicates | state-01.json | creating a task shows it in the list and updates the counter | product-report | escalate | - | product | 0.04 | 0.32 | 0.11 |
| product-create-duplicates | state-02.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.08 | 0.31 | 0.19 |
| product-done-filter-inverted | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.05 | 0.15 | 0.09 |
| product-empty-state-missing | state-01.json | empty board shows the empty state | product-report | escalate | - | product | 0.03 | 0.15 | 0.06 |
| product-empty-state-missing | state-02.json | blank tasks are ignored | product-report | escalate | - | product | 0.04 | 0.15 | 0.04 |
| product-get-drops-last-task | state-01.json | creating a task shows it in the list and updates the counter | product-report | escalate | - | product | 0.02 | 0.23 | 0.07 |
| product-get-drops-last-task | state-02.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.07 | 0.32 | 0.17 |
| product-toggle-no-refresh | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.08 | 0.22 | 0.16 |
| product-toggle-not-persisted | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.08 | 0.32 | 0.16 |
| product-toggle-wrong-key | state-01.json | completing a task updates the counter and the Done filter | product-report | escalate | - | product | 0.06 | 0.19 | 0.10 |
| test-add-button-renamed | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.07 | 0.30 | 0.06 |
| test-add-button-renamed | state-02.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | product | 0.11 | 0.23 | 0.11 |
| test-add-button-renamed | state-03.json | blank tasks are ignored | test-fix | escalate | - | product | 0.08 | 0.28 | 0.12 |
| test-checkbox-name-stale | state-01.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | product | 0.06 | 0.29 | 0.15 |
| test-counter-testid-typo | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.06 | 0.31 | 0.04 |
| test-heading-text-stale | state-01.json | empty board shows the empty state | test-fix | escalate | - | product | 0.04 | 0.26 | 0.09 |
| test-renamed-label-drift | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.05 | 0.13 | 0.03 |
| test-renamed-label-drift | state-02.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | product | 0.06 | 0.16 | 0.09 |
| test-renamed-label-drift | state-03.json | blank tasks are ignored | test-fix | escalate | - | product | 0.04 | 0.15 | 0.04 |
| test-stale-empty-copy | state-01.json | empty board shows the empty state | test-fix | escalate | - | product | 0.01 | 0.33 | 0.11 |
| test-stale-task-fixture | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.08 | 0.25 | 0.04 |
| test-wrong-expected-count | state-01.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.06 | 0.32 | 0.05 |
| test-wrong-route | state-01.json | empty board shows the empty state | test-fix | escalate | - | test | 0.05 | 0.31 | 0.16 |
| test-wrong-route | state-02.json | creating a task shows it in the list and updates the counter | test-fix | escalate | - | product | 0.06 | 0.28 | 0.12 |
| test-wrong-route | state-03.json | completing a task updates the counter and the Done filter | test-fix | escalate | - | test | 0.08 | 0.24 | 0.13 |
| test-wrong-route | state-04.json | blank tasks are ignored | test-fix | escalate | - | product | 0.03 | 0.29 | 0.15 |

