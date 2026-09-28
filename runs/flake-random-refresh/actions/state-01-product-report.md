# Empty board never renders the empty state (task fetch result discarded)

## Severity
High — the primary empty-state UI is unreachable on a fresh/empty board, and the failure is non-deterministic (intermittent), so it will pass and fail across runs.

## Summary
On the empty board, the app is expected to show the `empty-state` element and an active count of `0`. Instead, `getByTestId('empty-state')` is not found within the 5s timeout. The page heading (`TaskDeck`) renders, so the app loads, but the empty state never appears.

The diff in `app/page.tsx` shows the task-fetch handler returning early on a random condition before `setTasks`/`setLoading` run:

```
-     const res = await fetch("/api/tasks");
-     setTasks((await res.json()) as Task[]);
-     setLoading(false);
+     const res = await fetch("/api/tasks");
+     if (Math.random() < 0.5) return;
+     setTasks((await res.json()) as Task[]);
+     setLoading(false);
```

When the early `return` fires, the fetched tasks are never applied and the loading state is never cleared, so the empty state is not rendered. This matches the intermittent behavior: attempt 1 failed and the retry failed, but the random branch makes the outcome run-dependent.

## Reproduction
1. Open the app root (`/`) with an empty task board.
2. Wait for the `TaskDeck` heading to be visible.
3. Observe whether the `empty-state` element appears and whether `active-count` reads `0`.

## Evidence
```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('empty-state')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

Test run: `tasks.spec.ts` → "empty board shows the empty state" (project: chromium), status `unexpected`, attempt 1 failed (5.2s), retry failed (5.2s).

## Why this is a product bug
The test asserts user-visible behavior (empty state visible, active count `0`) that the app is supposed to provide. The failure is caused by application code in `app/page.tsx` discarding the fetch result and skipping state updates on a random branch, not by a test defect. Because the branch is random, the app's rendered state is non-deterministic — a real user can load an empty board and see no empty state.

## Suggested next step
Inspect `app/page.tsx`, specifically the task-fetch effect: remove the `if (Math.random() < 0.5) return;` early return so `setTasks(...)` and `setLoading(false)` always run after a successful fetch. Confirm the empty state renders deterministically across repeated runs.
