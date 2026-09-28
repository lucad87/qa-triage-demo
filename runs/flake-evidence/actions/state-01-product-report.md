# Blank-task submission intermittently leaves the task list unrendered (empty state never appears)

## Severity
High — the app's initial data load is nondeterministic, so the task list (and empty state) fails to render on roughly half of page loads. This is a user-visible correctness bug, not a test-only issue.

## Summary
After submitting a blank task, the test expects the empty state to be visible and the active count to read `0`. On the failing attempt, `getByTestId('empty-state')` was never found within the 5s timeout. The retry passed in 0.3s, indicating the failure is intermittent rather than a consistent logic error in blank-task handling.

The diff in `app/page.tsx` shows the initial fetch handler returning early on a random condition (`if (Math.random() < 0.5) return;`) before calling `setTasks(...)` and `setLoading(false)`. When that branch is taken, the component never populates tasks or clears its loading state, so the empty state is not rendered.

## Reproduction
1. Navigate to `/`.
2. Fill the "New task" input with whitespace (`"   "`).
3. Click the "Add" button.
4. Observe whether the empty state (`data-testid="empty-state"`) becomes visible and the active count reads `0`.

Note: because the underlying defect is probabilistic, this may pass on some runs and fail on others.

## Evidence
```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('empty-state')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

Test status: `flaky` — attempt 1 failed (5.2s); retry passed (0.3s).

Relevant change in `app/page.tsx`:
```
-     const res = await fetch("/api/tasks");
-     setTasks((await res.json()) as Task[]);
-     setLoading(false);
+     const res = await fetch("/api/tasks");
+     if (Math.random() < 0.5) return;
+     setTasks((await res.json()) as Task[]);
+     setLoading(false);
```

## Why this is a product bug
The failure is not caused by the test's assertions or timing assumptions. The changed code introduces a random early return in the data-loading path, which skips both `setTasks` and `setLoading(false)`. That directly prevents the empty state from rendering on affected loads, matching the observed "element(s) not found" error. The flaky pass/fail pattern (fail then pass on retry) is consistent with a `Math.random()`-gated branch rather than a deterministic regression.

## Suggested next step
Inspect `app/page.tsx` (the only changed file) and remove the `if (Math.random() < 0.5) return;` branch from the fetch handler so that `setTasks(...)` and `setLoading(false)` always execute after a successful response. Confirm the loading state is cleared on all paths, including error handling.
