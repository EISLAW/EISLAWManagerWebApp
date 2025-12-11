import { test, expect } from "@playwright/test";

test("C-010 Trace Full Request", async ({ page }) => {
  // Full request logging
  page.on("request", req => {
    if (req.url().includes("airtable")) {
      console.log(">>> REQUEST: " + req.url());
    }
  });
  
  page.on("response", async resp => {
    if (resp.url().includes("airtable")) {
      console.log("<<< RESPONSE: " + resp.status() + " " + resp.url());
      const body = await resp.text().catch(() => "");
      console.log("    BODY: " + body.substring(0, 400));
    }
  });

  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Open modal
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(2000);
  
  // Clear the default search
  const input = page.locator("input").first();
  console.log("\n=== CLEARING INPUT ===");
  await input.clear();
  await page.waitForTimeout(500);
  
  // Type ZZZ
  console.log("\n=== TYPING ZZZ ===");
  await input.type("ZZZ", { delay: 100 });
  await page.waitForTimeout(2000);
  
  // Screenshot
  await page.screenshot({ path: "tests/cto-link-trace.png", fullPage: true });
  
  const text = await page.evaluate(() => {
    const modal = document.querySelector(".max-h-64");
    return modal ? modal.innerText : "NO MODAL FOUND";
  });
  console.log("\n=== MODAL CONTENT ===");
  console.log(text);
});
