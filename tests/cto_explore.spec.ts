import { test, expect } from "@playwright/test";

test("Explore clients page", async ({ page }) => {
  await page.goto("http://localhost:5173/clients");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "tests/cto-explore.png", fullPage: true });
  
  // Get page HTML structure
  const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 5000));
  console.log("Page HTML (first 5000 chars):");
  console.log(bodyHTML);
  
  // Find all visible text
  const allText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log("\n\nVisible text:");
  console.log(allText);
});
