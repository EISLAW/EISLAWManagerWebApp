import { test, expect } from "@playwright/test";

test("C-010 Debug - Check Error Message", async ({ page }) => {
  // Capture console errors
  page.on("console", msg => {
    if (msg.type() === "error") console.log("CONSOLE ERROR: " + msg.text());
  });
  
  page.on("response", async resp => {
    const url = resp.url();
    if (url.includes("registry") || url.includes("airtable")) {
      const method = resp.request().method();
      console.log(method + " " + url.split(":8799")[1] + " -> " + resp.status());
      const body = await resp.text().catch(() => "");
      console.log("   Body: " + body.substring(0, 200));
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
  
  console.log("\n=== CLICKING LINK ===");
  await page.getByRole("button", { name: "Link Airtable" }).click();
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: "tests/c010-debug.png", fullPage: true });
  
  // Check for error message in modal
  const errorDiv = await page.locator("[class*=red]").first();
  if (await errorDiv.isVisible().catch(() => false)) {
    console.log("\n=== ERROR MESSAGE ===");
    console.log(await errorDiv.textContent());
  }
  
  // Get modal state
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector(".fixed.inset-0");
    return modal ? modal.innerText.substring(0, 500) : "No modal";
  });
  console.log("\n=== MODAL TEXT ===");
  console.log(modalText);
});
