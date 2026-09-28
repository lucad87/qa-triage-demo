import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("empty board shows the empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TaskDeck" })).toBeVisible();
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("active-count")).toHaveText("0");
});

test("creating a task shows it in the list and updates the counter", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New task").fill("Write the triage article");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByTestId("task-list")).toContainText("Write the triage article");
  await expect(page.getByTestId("active-count")).toHaveText("1");
});

test("completing a task updates the counter and the Done filter", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New task").fill("Ship the demo");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByTestId("active-count")).toHaveText("1");

  await page.getByRole("checkbox", { name: "Mark Ship the demo as done" }).click();
  await expect(page.getByTestId("active-count")).toHaveText("0");

  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("task-list")).toContainText("Ship the demo");
});

test("blank tasks are ignored", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New task").fill("   ");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("active-count")).toHaveText("0");
});
