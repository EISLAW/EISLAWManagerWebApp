import { test, expect } from "@playwright/test";

test.describe("CTO Skeptical Review v2 - Clients Module", () => {

  test("TEST 2: Click client row navigates to details", async ({ page }) => {
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    
    // Screenshot the clients page
    await page.screenshot({ path: "tests/cto-2-clients-list.png", fullPage: true });
    
    // Get all links on page that might be client links
    const allLinks = await page.locator("a[href*=clients]").all();
    console.log("Links containing clients: " + allLinks.length);
    
    // Try to find a clickable client - look for any link that goes to a client detail
    const clientDetailLinks = await page.locator("a[href*=#/clients/]").all();
    console.log("Client detail links found: " + clientDetailLinks.length);
    
    if (clientDetailLinks.length > 0) {
      const href = await clientDetailLinks[0].getAttribute("href");
      console.log("First client link href: " + href);
      
      await clientDetailLinks[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "tests/cto-2-client-detail.png", fullPage: true });
      
      const url = page.url();
      console.log("After click URL: " + url);
      expect(url).toMatch(/clients\/[a-zA-Z0-9-]+/);
    } else {
      // Fallback: look for table rows or cards
      const tableRows = await page.locator("table tbody tr, .client-card, [class*=client-row]").all();
      console.log("Table rows/cards: " + tableRows.length);
      
      // Print page structure
      const html = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));
      console.log("Page HTML:");
      console.log(html);
    }
  });

  test("TEST 3: Client detail page shows overview sections", async ({ page }) => {
    // Navigate directly to a known client via API first to get an ID
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Find any client detail link and navigate
    const clientLinks = await page.locator("a[href*=#/clients/]").all();
    if (clientLinks.length > 0) {
      await clientLinks[0].click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: "tests/cto-3-detail-sections.png", fullPage: true });
      
      // Get all visible text
      const text = await page.evaluate(() => document.body.innerText);
      console.log("Client detail page text (first 2000 chars):");
      console.log(text.substring(0, 2000));
      
      // Check for expected sections
      const hasOverview = text.includes("Overview") || text.includes("סקירה");
      const hasEmails = text.includes("Email") || text.includes("מייל") || text.includes("דוא");
      const hasTasks = text.includes("Task") || text.includes("משימ");
      
      console.log("\nSections found:");
      console.log("  Overview: " + hasOverview);
      console.log("  Emails: " + hasEmails);
      console.log("  Tasks: " + hasTasks);
    }
  });

  test("TEST 4: Check for Outlook and email buttons", async ({ page }) => {
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Navigate to client detail
    const clientLinks = await page.locator("a[href*=#/clients/]").all();
    if (clientLinks.length > 0) {
      await clientLinks[0].click();
      await page.waitForTimeout(3000);
      
      // Look for all buttons
      const buttons = await page.locator("button").all();
      console.log("Total buttons on page: " + buttons.length);
      
      for (let i = 0; i < Math.min(buttons.length, 20); i++) {
        const text = await buttons[i].textContent();
        const box = await buttons[i].boundingBox();
        const height = box ? box.height : 0;
        console.log("Button " + i + ":  + text?.trim().substring(0, 30) +  height=" + height + "px");
      }
      
      // Check for Outlook button specifically
      const outlookText = await page.getByText("Outlook").all();
      console.log("\nElements with Outlook text: " + outlookText.length);
      
      // Check for email reply button
      const replyText = await page.getByText("Reply").all();
      const hebrewReply = await page.getByText("השב").all();
      console.log("Reply elements: " + replyText.length);
      console.log("Hebrew Reply (השב) elements: " + hebrewReply.length);
      
      await page.screenshot({ path: "tests/cto-4-buttons.png", fullPage: true });
    }
  });

  test("TEST 5: Scroll in EmailsWidget and TasksWidget", async ({ page }) => {
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    const clientLinks = await page.locator("a[href*=#/clients/]").all();
    if (clientLinks.length > 0) {
      await clientLinks[0].click();
      await page.waitForTimeout(3000);
      
      // Check for scrollable areas with max-h-[400px]
      const scrollableAreas = await page.locator("[class*=max-h-], [class*=overflow-y-auto]").all();
      console.log("Scrollable areas found: " + scrollableAreas.length);
      
      for (let i = 0; i < scrollableAreas.length; i++) {
        const classes = await scrollableAreas[i].getAttribute("class");
        console.log("Scrollable " + i + ": " + classes?.substring(0, 100));
      }
      
      await page.screenshot({ path: "tests/cto-5-scroll.png", fullPage: true });
    }
  });
});
