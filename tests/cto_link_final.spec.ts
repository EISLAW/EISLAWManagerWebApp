import { test, expect } from "@playwright/test";

test("C-010 Final - Link Airtable Flow", async ({ page }) => {
  // Go to CTO Final Test client
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Click Airtable not linked
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(2000);
  
  // Type in search
  const input = page.locator("input").first();
  await input.fill("test");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "tests/cto-link-search-test.png", fullPage: true });
  
  // Get current page content
  const text = await page.evaluate(() => document.body.innerText);
  console.log("=== AFTER SEARCH test ===");
  console.log(text.substring(0, 2000));
  
  // Look for any clickable results
  const results = await page.locator("[role=option], li, [class*=hover\:bg-], tr").all();
  console.log("\nPossible result elements: " + results.length);
  
  // Check buttons
  const btns = await page.locator("button").all();
  console.log("Buttons visible: " + btns.length);
  for (let i = 0; i < btns.length; i++) {
    const t = await btns[i].textContent();
    console.log("  " + i + ". " + t?.trim().substring(0, 40));
  }
});
