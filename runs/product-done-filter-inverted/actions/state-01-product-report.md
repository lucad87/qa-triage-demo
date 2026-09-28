# Done filter shows the wrong tasks after completing a task

## Severity
High — the Done filter is a core view of the task list and returns the inverse set of tasks, so every user who completes a task sees incorrect content.

## Summary
After adding a task and marking it done, the active counter correctly drops to `0`, but switching to the **Done** filter does not show the completed task. The task list renders no matching element, so the completed task is missing from the Done view. The filter predicate in `app/page.tsx` appears to be inverted for the `done` case.

## Reproduction
1. Go to `/`.
2. Fill the "New task" field with "Ship the demo" and click **Add**.
3. Confirm the active count shows `1`.
4. Click the checkbox "Mark Ship the demo as done" and confirm the active count shows `0`.
5. Click the **Done** filter button.
6. Observe the task list — "Ship the demo" is not present.

## Evidence
```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('task-list')
Expected substring: "Ship the demo"
Timeout: 5000ms
Error: element(s) not found
```

The failure reproduced on both the initial attempt and the retry (5.4s each), so it is not a flake.

The diff for the changed file `app/page.tsx` shows the filter predicate was altered:

```
-     filter === "all" ? true : filter === "active" ? !task.done : task.done,
+     filter === "all" ? true : filter === "active" ? task.done : !task.done,
```

## Why this is a product bug
The test exercises expected product behavior: a task marked done should appear under the Done filter. The counter assertion (`active-count` = `0`) passed, confirming the task was actually marked done in state — so the failure is in how the list is filtered for display, not in the completion action itself. The diff inverts both the `active` and `done` branches of the filter predicate, which is consistent with the observed symptom: the Done view now selects tasks that are *not* done, so the completed task is excluded. This is a regression in the app under test, not a test defect.

## Suggested next step
Inspect the filter predicate in `app/page.tsx` (the only changed file). The `done` branch should select `task.done` and the `active` branch should select `!task.done`; the current diff has these swapped. Revert or correct the ternary so the Done filter returns completed tasks, then re-run `e2e/tasks.spec.ts`.
