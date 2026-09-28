# Task creation fails with HTTP 500, so the active counter never increments

## Severity
High — the primary "add a task" flow is broken; no task can be created, which blocks the counter and the Done filter from ever being exercised.

## Summary
The failing test adds a task ("Ship the demo") and immediately asserts that the active-task counter reads `1`. It reads `0` instead, and the failure reproduces on both the initial attempt and the retry. The diff for `app/api/tasks/route.ts` shows the POST handler was changed to return `{ error: "internal error" }` with status `500` and the `createTask` import was removed, so the create endpoint no longer persists a task. The counter assertion is the first observable symptom; the test never reaches the Done-filter assertion.

## Reproduction
1. Open the app at `/`.
2. Type `Ship the demo` into the "New task" field.
3. Click the "Add" button.
4. Observe the active-task counter (`data-testid="active-count"`).

Expected: counter shows `1`. Actual: counter shows `0`.

## Evidence
Assertion failure from the test run (chromium, attempt 1 and retry both failed, ~5.3s each):

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('active-count')
Expected: "1"
Received: "0"
Timeout:  5000ms
```

Diff of the only changed file, `app/api/tasks/route.ts`:

```
-   return NextResponse.json(createTask(title), { status: 201 });
+   return NextResponse.json({ error: "internal error" }, { status: 500 });

- import { createTask, listTasks } from "@/lib/store";
+ import { listTasks } from "@/lib/store";
```

Artifacts: `test-failed-1.png`, `error-context.md`, `trace.zip` under `test-results/tasks-completing-a-task-up-5a015-counter-and-the-Done-filter-chromium-retry1/`.

## Why this is a product bug
The test exercises a normal user flow through the UI and fails at the first assertion after adding a task. The accompanying diff shows the create endpoint was deliberately changed to return a 500 error and to stop importing `createTask`, which is consistent with the observed behavior: the POST fails, no task is stored, and the counter stays at `0`. This is a regression in the application code, not a flaky or incorrect test — the test's expectation (counter increments after a successful add) matches the documented product behavior, and the failure is deterministic across the retry.

## Suggested next step
Inspect `app/api/tasks/route.ts` (the only changed file). Restore the `createTask` import from `@/lib/store` and the `NextResponse.json(createTask(title), { status: 201 })` response in the POST handler, then re-run `e2e/tasks.spec.ts` to confirm the counter and Done-filter assertions pass.
