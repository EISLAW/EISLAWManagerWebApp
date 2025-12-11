import { test, expect } from "@playwright/test";

test("C-010 Final - Link Airtable Complete Flow", async ({ page }) => {
  page.on("response", async resp => {
    if ((resp.url().includes("registry") || resp.url().includes("airtable")) && resp.request().method() !== "GET") {
      console.log("API: " + resp.request().method() + " " + resp.url().split("/").slice(-2).join("/") + " -> " + resp.status());
      const body = await resp.text().catch(() => "");
      console.log("Body: " + body.substring(0, 300));
    }
  });

  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(2000);
  
  const input = page.locator("input[placeholder*=Search]");
  await input.click({ clickCount: 3 });
  await page.keyboard.type("ZZZ");
  await page.waitForTimeout(2000);
  
  await page.locator("text=ZZZ Test Client").first().click();
  await page.waitForTimeout(500);
  
  console.log("=== CLICKING LINK BUTTON ===");
  // Use button role specifically
  await page.getByRole("button", { name: "Link Airtable" }).click();
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: "tests/cto-link-final2.png", fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasError = pageText.includes("Error") || pageText.includes("UNIQUE") || pageText.includes("constraint") || pageText.includes("failed");
  const stillOpen = pageText.includes("Link Airtable Record");
  
  console.log("\n=== RESULT ===");
  console.log("Error visible: " + hasError);
  console.log("Modal still open: " + stillOpen);
  
  if (hasError || stillOpen) {
    const errorText = await page.locator("[class*=red]").first().textContent().catch(() => "");
    console.log("Error: " + errorText);
  } else {
    console.log("SUCCESS - Modal closed, no errors!");
  }
});
