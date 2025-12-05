import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("=== P1 VERIFICATION ===\n");

  await page.goto("http://localhost:5173/#/clients", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Task 2: Status Badges
  console.log("TASK 2: STATUS BADGES");
  const badges = await page.locator(".badge, [class*=badge], span[class*=rounded][class*=text-\\[10px\\]]").count();
  console.log("  Badges found:", badges);

  const atBadge = await page.locator("text=AT").count();
  const spBadge = await page.locator("span:has-text('SP')").count();
  const setupBadge = await page.locator("text=להגדרה").count();
  const archiveBadge = await page.locator("text=בארכיון").count();

  console.log("  AT badges:", atBadge);
  console.log("  SP badges:", spBadge);
  console.log("  להגדרה badges:", setupBadge);
  console.log("  בארכיון badges:", archiveBadge);

  // Task 3: Filter Dropdown
  console.log("\nTASK 3: FILTER DROPDOWN");
  const filterSelect = await page.locator("select[data-testid='status-filter']");
  const filterVisible = await filterSelect.isVisible();
  console.log("  Filter dropdown visible:", filterVisible);

  if (filterVisible) {
    const options = await filterSelect.locator("option").allTextContents();
    console.log("  Filter options:", options);
  }

  // Screenshot
  await page.screenshot({ path: "audit-screenshots/p1-verify-badges-filter.png", fullPage: true });
  console.log("\n  Screenshot saved: p1-verify-badges-filter.png");

  await browser.close();
  console.log("\n=== VERIFICATION COMPLETE ===");
})();
