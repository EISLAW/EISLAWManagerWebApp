import { test, expect } from "@playwright/test";

const BASE_URL = "http://20.217.86.4:5173";

test("Capture Dashboard before/after", async ({ page }) => {
  await page.goto(BASE_URL + "/#/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Check for Recent Activity
  const recentActivity = await page.locator("text=Recent Activity").count();
  console.log("Recent Activity visible:", recentActivity > 0);

  // Check for placeholder text
  const placeholderText = await page.locator("text=Activity feed placeholder").count();
  console.log("Placeholder text visible:", placeholderText > 0);

  await page.screenshot({ path: "audit-screenshots/dashboard-after-removal.png", fullPage: true });
});
