import { test, expect } from "@playwright/test";

test("Debug preview modal", async ({ page }) => {
  // Capture console logs
  const consoleLogs = [];
  page.on("console", msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    console.log("BROWSER:", msg.type(), msg.text());
  });

  // Capture errors
  page.on("pageerror", err => {
    console.log("PAGE ERROR:", err.message);
  });

  // Navigate to RAG page
  await page.goto("http://localhost:5173/#/rag");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Click refresh on transcripts
  const refreshBtn = page.getByTestId("rag.zoomTranscripts.refresh");
  await refreshBtn.click();
  await page.waitForTimeout(2000);

  // Find and click preview button
  const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
  console.log("Preview button visible:", await previewBtn.isVisible());

  if (await previewBtn.isVisible()) {
    // Click and wait
    await previewBtn.click();
    console.log("Clicked preview button");
    await page.waitForTimeout(3000);

    // Check what's in the DOM
    const modals = await page.locator(".fixed.inset-0").count();
    console.log("Modal count with .fixed.inset-0:", modals);

    const zIndex50 = await page.locator(".z-50").count();
    console.log("Elements with z-50:", zIndex50);

    // Check for pre tag
    const preTags = await page.locator("pre").count();
    console.log("Pre tags:", preTags);

    // Check for Edit button
    const editBtn = await page.locator('button:has-text("Edit Transcript")').count();
    console.log("Edit Transcript buttons:", editBtn);

    // Take screenshot
    await page.screenshot({ path: "/tmp/preview_debug.png", fullPage: true });
    console.log("Screenshot saved to /tmp/preview_debug.png");
  }

  // Print all console logs
  console.log("\n=== CONSOLE LOGS ===");
  consoleLogs.forEach(log => console.log(log.type + ":", log.text));
});
