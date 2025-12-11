// @ts-check
import { test, expect } from "playwright/test";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:8799";

test.describe("Zoom Cloud Recordings Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/#/rag?tab=ingest`);
    await page.waitForLoadState("networkidle");
  });

  test("should display Zoom Cloud Recordings section", async ({ page }) => {
    const section = page.locator("[data-testid=\"rag.zoomCloudRecordings\"]");
    await expect(section).toBeVisible({ timeout: 10000 });

    const syncButton = page.locator("[data-testid=\"rag.zoomCloud.sync\"]");
    await expect(syncButton).toBeVisible();
  });

  test("should sync recordings from Zoom Cloud", async ({ page }) => {
    const syncButton = page.locator("[data-testid=\"rag.zoomCloud.sync\"]");
    await syncButton.click();
    await expect(syncButton).not.toHaveText(/מסנכרן/, { timeout: 30000 });

    const recordings = page.locator("[data-testid^=\"rag.zoomCloud.item.\"]");
    const count = await recordings.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Zoom API Endpoints", () => {
  test("GET /api/zoom/recordings returns recordings", async ({ request }) => {
    const response = await request.get(`${API_URL}/api/zoom/recordings`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("recordings");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.recordings)).toBeTruthy();
  });

  test("GET /api/zoom/queue returns queue status", async ({ request }) => {
    const response = await request.get(`${API_URL}/api/zoom/queue`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("is_busy");
    expect(data).toHaveProperty("downloading");
    expect(data).toHaveProperty("transcribing");
  });

  test("GET /api/notifications returns notifications", async ({ request }) => {
    const response = await request.get(`${API_URL}/api/notifications`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("notifications");
    expect(data).toHaveProperty("unread_count");
  });
});
