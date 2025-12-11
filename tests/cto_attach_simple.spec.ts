import { test, expect } from "@playwright/test";

test("Capture Task Attachments state", async ({ page }) => {
  // Go to tasks
  await page.goto("http://localhost:5173/tasks");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "tests/cto-attach-1-board.png", fullPage: true });

  // Click on first task that looks like a card
  const taskCards = page.locator(".bg-white.rounded, .shadow-sm, [class*='card']");
  console.log("Found card-like elements:", await taskCards.count());

  // Try clicking on "בדיקת UX" text
  const uxTask = page.getByText("בדיקת UX");
  if (await uxTask.count() > 0) {
    console.log("Found UX task text");
    await uxTask.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/cto-attach-2-clicked.png", fullPage: true });
  }

  // Look for task modal or panel
  const modal = page.locator("[role='dialog'], .modal, .fixed.inset-0");
  console.log("Modal visible:", await modal.count());

  // Look for any data-testid elements
  const testIds = await page.locator("[data-testid]").all();
  console.log("Elements with data-testid:", testIds.length);
  for (const el of testIds.slice(0, 10)) {
    const testId = await el.getAttribute("data-testid");
    console.log("  -", testId);
  }

  // Check page content
  const pageContent = await page.content();
  console.log("Page has 'attachments':", pageContent.includes("attachments"));
  console.log("Page has 'נכסים':", pageContent.includes("נכסים"));
  console.log("Page has 'tm.asset':", pageContent.includes("tm.asset"));
});
