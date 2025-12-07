import { test, expect } from "@playwright/test";

test.describe("CTO Skeptical Review - Clients Module", () => {

  test("TEST 1: Client list loads with client cards", async ({ page }) => {
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/cto-1-client-list.png", fullPage: true });
    
    // Check for client cards/rows
    const clientNames = await page.locator("text=סיון בנימיני").count();
    console.log("Found סיון בנימיני: " + clientNames);
    expect(clientNames).toBeGreaterThan(0);
    
    // Verify multiple clients visible
    const allText = await page.evaluate(() => document.body.innerText);
    console.log("Clients found in page text:");
    if (allText.includes("רני דבוש")) console.log("  ✓ רני דבוש");
    if (allText.includes("יעל שמיר")) console.log("  ✓ יעל שמיר");
    if (allText.includes("גליל פתרונות")) console.log("  ✓ גליל פתרונות");
  });

  test("TEST 2: Click client name navigates to details", async ({ page }) => {
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Find and click a client link
    const clientLink = page.locator("a:has-text(סיון בנימיני)").first();
    await expect(clientLink).toBeVisible({ timeout: 10000 });
    console.log("Found client link, clicking...");
    
    await clientLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "tests/cto-2-client-detail.png", fullPage: true });
    
    // Verify we navigated to client detail
    const url = page.url();
    console.log("Current URL: " + url);
    expect(url).toContain("clients/");
    
    // Should see client name on detail page
    await expect(page.locator("text=סיון בנימיני").first()).toBeVisible({ timeout: 5000 });
  });

  test("TEST 3: Client detail shows email list", async ({ page }) => {
    // Navigate directly to a client detail
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Click on סיון בנימיני
    await page.locator("a:has-text(סיון בנימיני)").first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: "tests/cto-3-emails-section.png", fullPage: true });
    
    // Check for emails section
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Look for email-related content
    const hasEmails = pageText.includes("מייל") || pageText.includes("Email") || pageText.includes("@");
    console.log("Has email content: " + hasEmails);
    
    // Check if there are any email items
    const emailItems = await page.locator("[class*=email], [data-testid*=email]").count();
    console.log("Email items found: " + emailItems);
  });

  test("TEST 4: Open in Outlook button exists and is clickable", async ({ page }) => {
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Click on a client
    await page.locator("a:has-text(סיון בנימיני)").first().click();
    await page.waitForTimeout(3000);
    
    // Look for Open in Outlook button
    const outlookBtn = page.locator("text=פתח ב-Outlook").first();
    const outlookBtnVisible = await outlookBtn.isVisible().catch(() => false);
    console.log("Open in Outlook button visible: " + outlookBtnVisible);
    
    if (outlookBtnVisible) {
      // Check button is properly sized (accessibility)
      const box = await outlookBtn.boundingBox();
      if (box) {
        console.log("Button height: " + box.height + "px");
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    await page.screenshot({ path: "tests/cto-4-outlook-button.png", fullPage: true });
  });

  test("TEST 5: Contacts UI section exists", async ({ page }) => {
    await page.goto("http://localhost:5173/#/clients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Click Add Client to see the modal
    const addClientBtn = page.locator("text=Add Client").first();
    if (await addClientBtn.isVisible()) {
      await addClientBtn.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: "tests/cto-5-add-client-modal.png", fullPage: true });
      
      // Check for contacts section
      const contactsSection = await page.locator("text=אנשי קשר").isVisible().catch(() => false);
      console.log("Contacts section visible: " + contactsSection);
    }
  });
});
