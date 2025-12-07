import { test, expect } from "@playwright/test";

test("C-010 Debug - Network Trace", async ({ page }) => {
  // Enable network logging
  page.on("request", req => {
    if (req.url().includes("airtable")) {
      console.log("REQUEST: " + req.method() + " " + req.url());
    }
  });
  
  page.on("response", async resp => {
    if (resp.url().includes("airtable")) {
      console.log("RESPONSE: " + resp.status() + " " + resp.url());
      try {
        const body = await resp.text();
        console.log("BODY: " + body.substring(0, 500));
      } catch {}
    }
  });
  
  // Go to client
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Click Airtable button
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(1000);
  
  // The modal should auto-search with the client name
  console.log("\n=== WAITING FOR INITIAL SEARCH ===");
  await page.waitForTimeout(2000);
  
  // Clear and type new search
  const input = page.locator("input").first();
  await input.clear();
  await input.fill("ZZZ");
  console.log("\n=== TYPED ZZZ - WAITING FOR SEARCH ===");
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: "tests/cto-link-debug.png", fullPage: true });
  
  // Check results
  const text = await page.evaluate(() => document.body.innerText);
  console.log("\n=== PAGE TEXT ===");
  console.log(text.substring(text.indexOf("Search Airtable"), text.indexOf("Cancel") + 20));
});
