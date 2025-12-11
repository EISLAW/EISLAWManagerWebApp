import { test, expect } from "@playwright/test";

test("C-010 - Complete Link Flow with ZZZ Test", async ({ page }) => {
  // Track API calls
  page.on("response", async resp => {
    if (resp.url().includes("airtable") || resp.url().includes("registry")) {
      console.log("API: " + resp.request().method() + " " + resp.url().split("?")[0] + " -> " + resp.status());
      if (resp.status() >= 400) {
        const body = await resp.text().catch(() => "");
        console.log("ERROR: " + body.substring(0, 200));
      }
    }
  });

  // Go to CTO Final Test
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Click Airtable button
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(1000);
  
  // Search for ZZZ (which exists in Airtable)
  const input = page.locator("input").first();
  await input.clear();
  await input.fill("ZZZ");
  await page.waitForTimeout(2000);
  
  // Check if results appeared
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log("\n=== SEARCH RESULTS ===");
  const hasZZZ = pageText.includes("ZZZ Test Client");
  console.log("Found ZZZ Test Client in results: " + hasZZZ);
  
  if (hasZZZ) {
    // Click on a result
    const result = page.locator("text=ZZZ Test Client").first();
    await result.click();
    await page.waitForTimeout(500);
    
    // Click Link Airtable button
    console.log("\n=== CLICKING LINK BUTTON ===");
    await page.getByText("Link Airtable").click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: "tests/cto-link-complete.png", fullPage: true });
    
    // Check for errors
    const afterText = await page.evaluate(() => document.body.innerText);
    const hasError = afterText.includes("Error") || afterText.includes("UNIQUE") || afterText.includes("constraint");
    console.log("\n=== RESULT ===");
    console.log("Error visible: " + hasError);
    console.log("Modal still open: " + afterText.includes("Link Airtable Record"));
  }
});
