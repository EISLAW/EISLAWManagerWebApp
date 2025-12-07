import { test, expect } from "@playwright/test";

test("CTO Review - C-010 Link Airtable Full Test", async ({ page }) => {
  // Go to a client that is NOT linked to Airtable
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Click the Airtable not linked button
  const airtableBtn = page.locator("text=Airtable לא מקושר").first();
  await airtableBtn.click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: "tests/cto-c010-modal.png", fullPage: true });
  
  // Get modal content
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector("[class*=fixed][class*=z-50], [role=dialog], [class*=modal]");
    return modal ? modal.innerText : document.body.innerText;
  });
  console.log("=== MODAL/DIALOG CONTENT ===");
  console.log(modalText?.substring(0, 1500));
  
  // Find search input
  const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*=חיפוש]").first();
  const searchVisible = await searchInput.isVisible().catch(() => false);
  console.log("\nSearch input visible: " + searchVisible);
  
  if (searchVisible) {
    // Try searching for a client
    console.log("\n=== TYPING SEARCH ===");
    await searchInput.fill("סיון");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/cto-c010-search.png", fullPage: true });
    
    // Check results
    const results = await page.evaluate(() => document.body.innerText);
    const hasResults = results.includes("סיון") || results.includes("Result") || results.includes("תוצא");
    console.log("Search results appear: " + hasResults);
    
    // Look for selectable items
    const selectableItems = await page.locator("[role=option], [class*=cursor-pointer], button:has-text(בחר)").count();
    console.log("Selectable items found: " + selectableItems);
    
    // Try to select first result
    const firstResult = page.locator("[role=option], [class*=hover\:bg-]").first();
    if (await firstResult.isVisible().catch(() => false)) {
      console.log("\n=== CLICKING FIRST RESULT ===");
      
      // Listen for API calls
      page.on("response", async (resp) => {
        if (resp.url().includes("registry") || resp.url().includes("airtable")) {
          console.log("API: " + resp.request().method() + " " + resp.url().substring(0, 80) + " -> " + resp.status());
          if (resp.status() >= 400) {
            const body = await resp.text().catch(() => "");
            console.log("Error: " + body.substring(0, 200));
          }
        }
      });
      
      await firstResult.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "tests/cto-c010-after-select.png", fullPage: true });
      
      // Check for any error messages
      const pageText = await page.evaluate(() => document.body.innerText);
      const hasError = pageText.includes("Error") || pageText.includes("שגיאה") || pageText.includes("UNIQUE") || pageText.includes("constraint");
      console.log("\nError message visible: " + hasError);
      
      // Check if Airtable is now linked
      const nowLinked = pageText.includes("Airtable מקושר") || !pageText.includes("Airtable לא מקושר");
      console.log("Airtable now linked: " + nowLinked);
    }
  }
});
