# Blank tasks are no longer ignored: empty-state message removed, so submitting whitespace shows no feedback

## Severity
Medium — user-visible regression in the empty state of the task list. No data loss or crash, but the app silently drops whitespace-only input with no confirmation that the list is empty.

## Summary
The test "blank tasks are ignored" fills the "New task" field with `"   "` (three spaces) and clicks "Add", then expects the empty-state element (`data-testid="empty-state"`) to be visible and the active count to read `0`.

The empty-state element is not rendered at all, so the assertion fails. The diff in `app/page.tsx` shows the empty-state paragraph was replaced with `null`:

```
-       ) : visible.length === 0 ? (
-         <p data-testid="empty-state">Nothing here yet.</p>
-       ) : (
+       ) : visible.length === 0 ? null : (
```

The blank-task filtering itself appears to still work (the test's second assertion on `active-count` was never reached, so this is unconfirmed), but the empty-state UI is gone. The test correctly detects a real change in rendered output.

## Reproduction
1. Open the app at `/`.
2. Enter three spaces (`"   "`) into the "New task" field.
3. Click the "Add" button.
4. Observe the task list area — the empty-state message ("Nothing here yet.") is not displayed.

## Evidence
Assertion failure from the Playwright run (failed on both the initial attempt and the retry):

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('empty-state')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

Source diff for `app/page.tsx`:

```
--- app/page.tsx
-       ) : visible.length === 0 ? (
-         <p data-testid="empty-state">Nothing here yet.</p>
-       ) : (
+       ) : visible.length === 0 ? null : (
```

Artifacts: `test-failed-1.png`, `error-context.md`, `trace.zip` under `test-results/tasks-blank-tasks-are-ignored-chromium-retry1/`.

## Why this is a product bug
The failure is not flakiness or a test-environment issue: the same assertion failed on both the first attempt and the retry, and the accompanying diff shows a deliberate change to the render branch that previously produced the empty-state element. The test asserts on user-visible behavior (an empty list should say so), and that behavior was removed. The test is doing its job by catching the regression.

## Suggested next step
Inspect `app/page.tsx` (the only changed file) around the `visible.length === 0` branch. Confirm whether returning `null` was intentional; if the empty-state message is still a product requirement, restore the `<p data-testid="empty-state">` element. If the removal was intentional, the test and the product spec need to be updated together rather than the test being treated as the defect.
