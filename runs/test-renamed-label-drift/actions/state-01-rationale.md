The failure was pure selector drift: the app's new-task input was renamed from aria-label="New task" to aria-label="Task title" (see the diff in app/page.tsx). The test's `getByLabel("New task")` therefore never resolved, and `fill` timed out after 30s on both attempts.

I updated the accessible-name locator to "Task title" in all three tests that fill the input (create, complete, blank). Assertions, test intent, and coverage are unchanged — no assertions were weakened and no tests were removed. The other locators (Add button, checkbox name, Done filter, testids) were not affected by the diff and are left as-is.

Remaining risk: the label rename is a product-side change, so if the app later reverts to "New task" these tests will break again. If the rename was unintentional, the honest fix would be on the app side rather than the test; here the diff indicates it's the intended current label, so aligning the test is correct.
