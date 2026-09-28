# Task creation fails: POST /api/tasks returns 500 and the new task never appears in the list

## Severity
High — the primary create-task flow is broken; no task can be added and the active counter never increments.

## Summary
Creating a task from the UI fails. The test fills the "New task" field, clicks "Add", and then waits for the task text to appear in the task list. The task list locator is never found, so the assertion times out. The diff shows the create handler in `app/api/tasks/route.ts` was changed to return `{ error: "internal error" }` with status 500, and the `createTask` import was removed while `listTasks` was kept — so the create path no longer calls the store.

## Reproduction
1. Navigate to `/`.
2. Fill the "New task" field with "Write the triage article".
3. Click the "Add" button.
4. Observe that the task list does not contain the new task and the active count is not updated.

## Evidence
```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('task-list')
Expected substring: "Write the triage article"
Timeout: 5000ms
Error: element(s) not found
```

The failure reproduced on both the initial attempt (5.2s) and the retry (5.3s), so it is not a flake.

Relevant diff in `app/api/tasks/route.ts`:
```
-   return NextResponse.json(createTask(title), { status: 201 });
+   return NextResponse.json({ error: "internal error" }, { status: 500 });

- import { createTask, listTasks } from "@/lib/store";
+ import { listTasks } from "@/lib/store";
```

## Why this is a product bug
The test exercises a normal user action (adding a task) and asserts on user-visible output. The only changed file is the API route that handles task creation, and the diff shows the success response was replaced with a hardcoded 500 error and the `createTask` import was dropped. This is a regression in the application code, not a test defect: the test's expectations (task appears in the list, counter becomes "1") match the intended behavior, and the failure is deterministic across retries.

## Suggested next step
Inspect `app/api/tasks/route.ts` (the only changed file). Restore the `createTask` import from `@/lib/store` and the success response that returns the created task with status 201, replacing the hardcoded 500 error. Confirm the create handler still calls the store before returning.
