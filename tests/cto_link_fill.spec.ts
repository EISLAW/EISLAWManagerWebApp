import { test, expect } from "@playwright/test";

test("C-010 - Fill method test", async ({ page }) => {
  page.on("request", req => {
    if (req.url().includes("airtable")) {
      console.log(">>> " + req.url());
    }
  });
  
  page.on("response", async resp => {
    if (resp.url().includes("airtable")) {
      const body = await resp.text().catch(() => "");
      console.log("<<< " + resp.status() + " items:" + (body.match(/"items":\[([^\]]*)\]/) || ["",""])[1].substring(0, 100));
    }
  });

  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Open modal
  await page.locator("text=Airtable").first().click();
  await page.waitForTimeout(3000);  // Wait longer for initial search
  
  // Find the input with placeholder
  const input = page.locator("input[placeholder*=Search]");
  console.log("Input found: " + await input.isVisible());
  
  // Triple-click to select all then type
  await input.click({ clickCount: 3 });
  await page.keyboard.type("ZZZ");
  console.log("Typed ZZZ");
  
  await page.waitForTimeout(2000);  // Wait for debounce + search
  
  await page.screenshot({ path: "tests/cto-link-fill.png", fullPage: true });
  
  const modalContent = await page.evaluate(() => {
    const modal = document.querySelector(".max-h-64, [class*=max-h-64]");
    return modal ? modal.innerText.substring(0, 500) : "Modal not found";
  });
  console.log("=== MODAL ===");
  console.log(modalContent);
});
