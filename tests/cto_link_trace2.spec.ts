import { test, expect } from "@playwright/test";

test("C-010 - Full Trace", async ({ page }) => {
  // Log ALL requests/responses
  page.on("response", async resp => {
    const url = resp.url();
    if (url.includes("8799") || url.includes("api")) {
      console.log(resp.request().method() + " " + url.split(":8799")[1]?.substring(0, 60) + " -> " + resp.status());
      if (resp.status() >= 400) {
        const body = await resp.text().catch(() => "");
        console.log("   ERROR: " + body.substring(0, 200));
      }
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
  
  console.log("\n=== LINK CLICK ===");
  await page.getByRole("button", { name: "Link Airtable" }).click();
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: "tests/cto-link-trace2.png", fullPage: true });
  
  // Check error in modal
  const errorEl = await page.locator("[class*=red-]").first();
  if (await errorEl.isVisible().catch(() => false)) {
    const errorText = await errorEl.textContent();
    console.log("\n=== ERROR MESSAGE ===");
    console.log(errorText);
  }
});
