import { test, expect } from "@playwright/test";

test.describe("RAG Page - Senior Review", () => {
  const baseUrl = "http://localhost:5173";

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl + "/#/rag");
    await page.waitForLoadState("networkidle");
  });

  test("Page loads with correct title", async ({ page }) => {
    await expect(page.locator("h1.heading")).toContainText("AI");
  });

  test("Assistant tab - form elements accessible", async ({ page }) => {
    const questionInput = page.locator("[data-testid='rag.assistant.question']");
    await expect(questionInput).toBeVisible();

    const domainSelect = page.locator("[data-testid='rag.assistant.domain']");
    await expect(domainSelect).toBeVisible();

    const submitBtn = page.locator("[data-testid='rag.assistant.submit']");
    await expect(submitBtn).toBeVisible();
  });

  test("Assistant tab - empty question shows error", async ({ page }) => {
    const submitBtn = page.locator("[data-testid='rag.assistant.submit']");
    await submitBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=שאלה נדרשת")).toBeVisible();
  });

  test("Ingest tab - dropzone visible", async ({ page }) => {
    await page.goto(baseUrl + "/#/rag?tab=ingest");
    await page.waitForLoadState("networkidle");

    const dropzone = page.locator("[data-testid='rag.dropzone']");
    await expect(dropzone).toBeVisible();
  });

  test("Ingest tab - Zoom section exists", async ({ page }) => {
    await page.goto(baseUrl + "/#/rag?tab=ingest");
    await page.waitForLoadState("networkidle");

    const zoomSection = page.locator("[data-testid='rag.zoomTranscripts']");
    await expect(zoomSection).toBeVisible();
  });

  test("API health check", async ({ page }) => {
    const response = await page.request.get("http://localhost:8799/health");
    expect(response.status()).toBe(200);
  });

  test("RAG inbox endpoint responds", async ({ page }) => {
    const response = await page.request.get("http://localhost:8799/api/rag/inbox");
    expect(response.status()).toBe(200);
  });

  test("BUG: Zoom transcripts endpoint missing", async ({ page }) => {
    const response = await page.request.get("http://localhost:8799/api/zoom/transcripts");
    // This documents the bug - endpoint returns 404
    expect(response.status()).toBe(404);
  });

  test("Bulk action controls visible on ingest tab", async ({ page }) => {
    await page.goto(baseUrl + "/#/rag?tab=ingest");
    await page.waitForLoadState("networkidle");

    const bulkDate = page.locator("[data-testid='rag.inbox.bulkDate']");
    await expect(bulkDate).toBeVisible();
  });

  test("RTL direction applied", async ({ page }) => {
    const rtlDiv = page.locator("div[dir='rtl']").first();
    await expect(rtlDiv).toBeVisible();
  });
});
