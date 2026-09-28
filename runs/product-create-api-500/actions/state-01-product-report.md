# Empty board fails to render the empty state

## Severity
Medium — the empty-state UI is unreachable on a fresh board, so first-run users see no guidance. The failure is intermittent (attempt 1 failed, retry passed), which suggests a race rather than a hard break, but the underlying defect is real.

## Summary
The test `empty board shows the empty state` (e2e/tasks.spec.ts, chromium) navigates to `/`, confirms the "TaskDeck" heading renders, then asserts that `getByTestId("empty-state")` is visible and that `getByTestId("active-count")` reads `0`. On the first attempt the empty-state element was not found within the 5s timeout; the retry passed in 0.2s. The board heading renders, so the page loads — the empty-state element itself is missing or delayed on the initial render.

## Reproduction
1. Open `/` in a browser with no tasks present.
2. Wait for the "TaskDeck" heading to become visible.
3. Observe whether the element with `data-testid="empty-state"` appears.
4. Observe the value shown in `data-testid="active-count"`.

## Evidence
```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('empty-state')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

Test result: `attempt 1 failed (5.2s); retry passed (0.2s)` — status `flaky`.

## Why this is a product bug
The test correctly detects a real regression: the diff to `app/api/tasks/route.ts` removes the `createTask` import and replaces the task-creation response with a hardcoded `500`:

```
-   return NextResponse.json(createTask(title), { status: 201 });
+   return NextResponse.json({ error: "internal error" }, { status: 500 });

- import { createTask, listTasks } from "@/lib/store";
+ import { listTasks } from "@/lib/store";
```

This is a genuine change in application behavior, not a test artifact. The intermittent pass on retry is consistent with a timing-dependent render path (e.g. the empty state only appearing after a failed or delayed data fetch settles), which the test's 5s timeout does not reliably cover. Because the heading renders while the empty state does not, the failure is in the board's empty-state rendering path, not in page load.

## Suggested next step
Inspect `app/api/tasks/route.ts` (the only changed file) and the board component that consumes its response. Confirm whether the `500` response causes the client to skip rendering the empty state, and whether the empty state should render while the request is pending or after it fails. If the `500` is intentional, the client needs an explicit error/empty branch; if it is not, restore the `createTask` import and the `201` response.
