import { test, expect } from "@playwright/test";

test.describe("CTO Review v3", () => {

  test("Full client journey", async ({ page }) => {
    // Step 1: Go to clients page
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "tests/cto-v3-1-clients-list.png", fullPage: true });
    
    // Find all links
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a")).map(a => ({
        href: a.href,
        text: a.textContent?.trim().substring(0, 30)
      })).filter(l => l.href.includes("clients/") && \!l.href.endsWith("clients"));
    });
    console.log("Client detail links:");
    allLinks.slice(0, 10).forEach(l => console.log("  " + l.text + " -> " + l.href));
    
    expect(allLinks.length).toBeGreaterThan(0);
    
    // Step 2: Click first client link
    if (allLinks.length > 0) {
      await page.goto(allLinks[0].href);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "tests/cto-v3-2-client-detail.png", fullPage: true });
      
      console.log("\nNavigated to: " + page.url());
      
      // Step 3: Check what is on the page
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log("\nPage text (first 3000 chars):");
      console.log(pageText.substring(0, 3000));
      
      // Step 4: Find all buttons
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("button")).map(b => ({
          text: b.textContent?.trim().substring(0, 40),
          height: b.getBoundingClientRect().height
        }));
      });
      console.log("\nButtons found: " + buttons.length);
      buttons.forEach((b, i) => console.log("  " + i + ".  + b.text +  height=" + b.height + "px"));
      
      // Step 5: Check for scrollable areas
      const scrollables = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("[class*=overflow-y-auto], [class*=max-h-]")).map(el => ({
          classes: el.className.substring(0, 80),
          height: el.getBoundingClientRect().height
        }));
      });
      console.log("\nScrollable areas: " + scrollables.length);
      scrollables.forEach((s, i) => console.log("  " + i + ". " + s.classes + " h=" + s.height));
      
      // Step 6: Check for specific elements
      const outlook = await page.evaluate(() => document.body.innerHTML.includes("Outlook"));
      const createTask = await page.evaluate(() => document.body.innerHTML.includes("Create Task") || document.body.innerHTML.includes("צור משימה"));
      const emails = await page.evaluate(() => document.body.innerHTML.includes("@") || document.body.innerHTML.includes("מייל"));
      
      console.log("\nFeature checks:");
      console.log("  Outlook reference: " + outlook);
      console.log("  Create Task: " + createTask);
      console.log("  Email content: " + emails);
    }
  });
});
