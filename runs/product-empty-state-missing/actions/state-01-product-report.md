# Empty board no longer renders the empty state

## Severity
Medium — user-visible regression on the default board view; no data loss or crash, but the empty board gives the user no feedback.

## Summary
When the board has no visible tasks, the app now renders nothing in place of the empty-state message. The test `empty board shows the empty state` (`e2e/tasks.spec.ts`, chromium) fails because `data-testid="empty-state"` is not present in the DOM. The diff in `app/page.tsx` replaces the empty-state element with `null`, which matches the observed failure.

## Reproduction
1. Open the app root (`/`) with an empty board (no visible tasks).
2. Confirm the `TaskDeck` heading is visible.
3. Look for the empty-state element (`data-testid="empty-state"`).
4. Observe that no empty-state element is rendered.

## Evidence
```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('empty-state')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

Failure reproduced on both the initial attempt (5.3s) and the retry (5.2s).

Relevant change in `app/page.tsx`:
```
-       ) : visible.length === 0 ? (
-         <p data-testid="empty-state">Nothing here yet.</p>
-       ) : (
+       ) : visible.length === 0 ? null : (
```

## Why this is a product bug
The test asserts existing, intended behavior: an empty board shows an empty-state message. The only changed file, `app/page.tsx`, removes that element and substitutes `null`, so the assertion fails for the reason the test was written to catch. The failure is deterministic (failed on both attempt and retry) and is not attributable to test flakiness, timing, or environment.

## Suggested next step
Inspect `app/page.tsx` (the only changed file) around the `visible.length === 0` branch and restore the empty-state element, or confirm whether removing it was intentional. If the empty state was intentionally removed, the test and the product requirement should be updated together rather than leaving the assertion failing.
