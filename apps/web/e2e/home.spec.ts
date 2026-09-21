import { expect, test } from "@playwright/test";

test("home loads and shows health", async ({ page }) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("heading", {
        name: /systems operational|action required|attention needed|status unknown/i,
      })
      .first(),
  ).toBeVisible({
    timeout: 15_000,
  });
});

test("navigation reaches alerts and docker", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /alerts/i })
    .first()
    .click();
  await expect(page).toHaveURL(/alerts/);
  await page.goto("/docker");
  await expect(page.getByRole("heading", { name: /docker/i })).toBeVisible();
});

test("destructive docker action requires confirmation step", async ({ page }) => {
  await page.goto("/docker");
  // The page must never offer one-click destructive actions without a dialog.
  // If containers exist, Start/Stop buttons open a confirm dialog.
  const stopBtn = page.getByRole("button", { name: /^stop$/ }).first();
  if (await stopBtn.count()) {
    await stopBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  } else {
    await expect(page.getByText(/docker|containers/i).first()).toBeVisible();
  }
});
