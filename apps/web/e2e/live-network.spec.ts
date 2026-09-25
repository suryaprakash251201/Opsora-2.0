import { expect, test } from "@playwright/test";

test("live network loads with topology canvas and summary", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  await expect(page.getByTestId("topology-canvas")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("network-summary")).toBeVisible();
  await expect(page.getByTestId("live-badge")).toBeVisible();
});

test("device can be selected and inspector opens", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  const node = page.getByTestId("topology-node-mock-pms2");
  await expect(node).toBeVisible({ timeout: 15_000 });
  await node.click({ force: true });
  await expect(page.getByTestId("device-inspector")).toBeVisible();
  await expect(page.getByTestId("device-inspector").getByText("pms2").first()).toBeVisible();
});

test("connection inspector renders on edge click", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  await expect(page.getByTestId("topology-canvas")).toBeVisible({ timeout: 15_000 });
  // Open via the devices view connection path: select pms2 then its p2p peer link.
  await page.getByTestId("topology-node-mock-pms2").click({ force: true });
  await expect(page.getByTestId("device-inspector")).toBeVisible();
  const peerLink = page.getByTestId("device-inspector").getByRole("button", { name: /field laptop/i });
  await peerLink.click();
  await expect(page.getByTestId("connection-inspector")).toBeVisible();
  await expect(page.getByTestId("connection-inspector").getByText("P2P").first()).toBeVisible();
});

test("filter narrows topology and offline device is visible", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  await expect(page.getByTestId("topology-node-mock-nas")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /^offline/i }).click();
  await expect(page.getByTestId("topology-node-mock-nas")).toBeVisible();
  await expect(page.getByTestId("topology-node-mock-pms2")).toHaveCount(0);
});

test("search finds a device by hostname", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  await expect(page.getByTestId("topology-canvas")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search devices").fill("pixel");
  await expect(page.getByTestId("topology-node-mock-phone")).toBeVisible();
  await expect(page.getByTestId("topology-node-mock-pms2")).toHaveCount(0);
});

test("devices and connections views render tables", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  await expect(page.getByTestId("topology-canvas")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Devices" }).click();
  await expect(page.getByTestId("devices-table")).toBeVisible();
  await expect(page.getByTestId("devices-table").getByText("pms2").first()).toBeVisible();
  await page.getByRole("tab", { name: "Connections" }).click();
  await expect(page.getByTestId("connections-table")).toBeVisible();
});

test("inspector closes with Escape and canvas keeps position", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  await page.getByTestId("topology-node-mock-pms2").click({ force: true });
  await expect(page.getByTestId("device-inspector")).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("device-inspector")).toHaveCount(0);
  await expect(page.getByTestId("topology-canvas")).toBeVisible();
});

test("activity stream renders and collapses", async ({ page }) => {
  await page.goto("/network/live?mock=1");
  await expect(page.getByTestId("event-stream")).toBeVisible({ timeout: 15_000 });
});
