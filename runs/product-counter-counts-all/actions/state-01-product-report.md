# Active task counter does not decrease when a task is marked done

## Severity
High — the counter is the primary at-a-glance indicator of remaining work, and it now reports a permanently wrong value once any task is completed.

## Summary
After a task is marked done, the active-task counter still shows the pre-completion count. In the failing test, adding one task shows "1", and marking it done leaves the counter at "1" instead of "0". The Done filter itself appears to work (the test never reached that assertion, so it is unverified). The counter is computed from `tasks.length` rather than from the number of not-done tasks, so it counts all tasks regardless of completion state.

## Reproduction
1. Go to `/`.
2. Enter "Ship the demo" in the "New task" field and click "Add".
3. Observe the active counter reads "1".
4. Click the "Mark Ship the demo as done" checkbox.
5. Observe the active counter still reads "1"; expected "0".

## Evidence
```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('active-count')
Expected: "0"
Received: "1"
Timeout:  5000ms
```

The failure reproduced on both the initial run (5.3s) and the retry (5.4s), so it is not a flake.

## Why this is a product bug
The test exercises a normal user flow — add a task, complete it, check the counter — and asserts the counter reflects the number of outstanding tasks. The counter is a user-facing value, and the observed behavior contradicts its meaning: a completed task is still counted as active. The accompanying diff shows the count is derived from `tasks.length` instead of filtering out done tasks, which is a logic regression in the app rather than a test or environment issue.

## Suggested next step
Inspect `app/page.tsx`, the only changed file, and restore the active-count derivation to filter out completed tasks:

```ts
const activeCount = tasks.filter((task) => !task.done).length;
```

The current code uses `tasks.length`, which ignores the `done` flag. After fixing, re-run `e2e/tasks.spec.ts` to confirm the counter reaches "0" and that the subsequent Done-filter assertion also passes — that assertion was never reached in this run, so the filter behavior remains unverified.
