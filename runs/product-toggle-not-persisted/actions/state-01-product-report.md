# Completing a task does not mark it done: active counter stays at 1 and the Done filter stays empty

## Severity
High — the core "complete a task" action is a no-op, so the primary workflow of the app is broken. No data loss or security impact observed.

## Summary
Toggling a task's checkbox does not change its done state. After adding a task and clicking its "Mark … as done" checkbox, the active-task counter still reads `1` instead of `0`, and the task never appears under the Done filter. The failure reproduced on both the initial run and the retry.

## Reproduction
1. Open `/`.
2. Fill the "New task" field with `Ship the demo` and click **Add**.
3. Observe the active counter (`active-count`) shows `1`.
4. Click the checkbox labelled "Mark Ship the demo as done".
5. Observe the active counter — expected `0`, actual `1`.
6. Click the **Done** filter and observe the task list — expected to contain `Ship the demo`, actual: it does not.

## Evidence
Assertion failure from the test run (chromium, both attempts):

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('active-count')
Expected: "0"
Received: "1"
Timeout:  5000ms
```

The failure state also includes a diff against `lib/store.ts`:

```
--- lib/store.ts
-     task.done = !task.done;
+     task.done = task.done;
```

Attachments captured with the failure: `test-failed-1.png` (screenshot), `error-context.md`, and `trace.zip`.

## Why this is a product bug
The test exercises a normal user flow through public UI (add task → toggle done → check counter → check Done filter) and fails at the first observable consequence of completing a task. The counter and the Done filter are both derived from the same task state, and both remain unchanged, which is consistent with the toggle never mutating the task rather than with a rendering or timing issue. The accompanying `lib/store.ts` diff shows the toggle assignment reduced to a self-assignment (`task.done = task.done`), which would produce exactly this behaviour: the click is handled, but the done flag is never flipped. The test is asserting the intended behaviour, so the defect is in the app, not the test.

## Suggested next step
Inspect the task-toggle logic in `lib/store.ts` (the only changed file) and restore the state mutation so the done flag is inverted on toggle, e.g. `task.done = !task.done`. Confirm the active counter and the Done filter both derive from that flag, then re-run `e2e/tasks.spec.ts`.
