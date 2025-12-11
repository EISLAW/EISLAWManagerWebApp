import { test, expect } from "@playwright/test";

test("C-010 VERIFY - Link Airtable Complete", async ({ page }) => {
  page.on("response", async resp => {
    const url = resp.url();
    if (url.includes("registry") || url.includes("airtable")) {
      const method = resp.request().method();
      if (method !== "GET" || url.includes("search")) {
        console.log(method + " " + url.split(":8799")[1]?.substring(0,50) + " -> " + resp.status());
        if (resp.status() >= 400) {
          console.log("ERROR: " + await resp.text().catch(() => ""));
        }
      }
    }
  });

  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Open Link Airtable modal
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(2000);
  
  // Search for ZZZ
  const input = page.locator("input[placeholder*=Search]");
  await input.click({ clickCount: 3 });
  await page.keyboard.type("ZZZ");
  await page.waitForTimeout(2000);
  
  // Select first result
  await page.locator("text=ZZZ Test Client").first().click();
  await page.waitForTimeout(500);
  
  // Click Link button
  console.log("=== LINKING ===");
  await page.getByRole("button", { name: "Link Airtable" }).click();
  await page.waitForTimeout(4000);
  
  // Check result
  const pageText = await page.evaluate(() => document.body.innerText);
  const modalClosed = !pageText.includes("Link Airtable Record");
  const hasError = pageText.includes("Error") || pageText.includes("failed") || pageText.includes("UNIQUE");
  
  console.log("\n=== RESULT ===");
  console.log("Modal closed: " + modalClosed);
  console.log("Error visible: " + hasError);
  
  if (modalClosed && !hasError) {
    console.log("✅ SUCCESS - Airtable linked!");
  } else {
    console.log("❌ FAILED");
    await page.screenshot({ path: "tests/c010-fail.png", fullPage: true });
  }
});
