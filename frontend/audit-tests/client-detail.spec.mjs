import { test, expect } from "@playwright/test";

const BASE_URL = "http://20.217.86.4:5173";

test("Capture Client Detail Page", async ({ page }) => {
  // Go directly to a client detail page
  await page.goto(BASE_URL + "/#/clients/%D7%A1%D7%99%D7%95%D7%9F%20%D7%91%D7%A0%D7%99%D7%9E%D7%99%D7%A0%D7%99");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  console.log("=== Client Detail Page ===");

  // Get page title/header
  const header = await page.locator("h1, h2").first().textContent();
  console.log("Header:", header);

  // Find all tabs
  const tabs = await page.locator("[role=tab], nav a, button").allTextContents();
  console.log("Tabs/Buttons:", tabs.filter(t => t.trim()));

  await page.screenshot({ path: "audit-screenshots/client-detail-tabs.png", fullPage: true });

  // Try clicking the emails tab
  const emailsTab = page.locator("text=אימיילים").first();
  if (await emailsTab.isVisible()) {
    await emailsTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "audit-screenshots/client-detail-emails.png", fullPage: true });
    console.log("✓ Emails tab clicked");
  }

  // Try clicking the tasks tab
  const tasksTab = page.locator("text=משימות").first();
  if (await tasksTab.isVisible()) {
    await tasksTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "audit-screenshots/client-detail-tasks.png", fullPage: true });
    console.log("✓ Tasks tab clicked");
  }
});
