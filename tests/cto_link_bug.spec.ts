import { test, expect } from "@playwright/test";

test("C-010 - Test for UNIQUE constraint bug", async ({ page }) => {
  page.on("response", async resp => {
    if ((resp.url().includes("registry") || resp.url().includes("airtable")) && resp.request().method() !== "GET") {
      console.log("API: " + resp.request().method() + " " + resp.url().split("?")[0].split("/").slice(-2).join("/") + " -> " + resp.status());
      const body = await resp.text().catch(() => "");
      console.log("Body: " + body.substring(0, 300));
    }
  });

  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Open modal
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(2000);
  
  // Search for ZZZ
  const input = page.locator("input[placeholder*=Search]");
  await input.click({ clickCount: 3 });
  await page.keyboard.type("ZZZ");
  await page.waitForTimeout(2000);
  
  // Click first result
  const firstResult = page.locator("text=ZZZ Test Client").first();
  await firstResult.click();
  await page.waitForTimeout(500);
  
  // Click Link Airtable button
  console.log("=== CLICKING LINK BUTTON ===");
  await page.getByText("Link Airtable").click();
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: "tests/cto-link-bug.png", fullPage: true });
  
  // Check for error message
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasError = pageText.includes("Error") || pageText.includes("UNIQUE") || pageText.includes("constraint") || pageText.includes("failed");
  const stillOpen = pageText.includes("Link Airtable Record");
  
  console.log("\n=== RESULT ===");
  console.log("Error visible: " + hasError);
  console.log("Modal still open: " + stillOpen);
  
  if (hasError) {
    // Find error message
    const errorArea = await page.locator("[class*=red], [class*=error]").first().textContent().catch(() => "");
    console.log("Error message: " + errorArea);
  }
});
