import { test, expect } from "@playwright/test";

test.describe("CTO Test - Sidebar Navigation to Clients", () => {

  test("1. Click Clients in sidebar", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/sidebar-1-home.png", fullPage: true });

    // Click on Clients in sidebar (right side)
    const clientsLink = page.locator("text=Clients").first();
    console.log("Clients link found:", await clientsLink.count());

    if (await clientsLink.count() > 0) {
      await clientsLink.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "tests/sidebar-2-clients.png", fullPage: true });

      // Check URL
      console.log("Current URL:", page.url());
    }

    // Look for client rows in a table/list
    const clientRows = page.locator("tr, [role='row'], .client-row");
    console.log("Client rows found:", await clientRows.count());

    // Check page content
    const content = await page.textContent("body");
    console.log("Has 'סיון':", content?.includes("סיון"));
    console.log("Has 'לקוח':", content?.includes("לקוח"));
  });

  test("2. Navigate to specific client", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);

    // Click Clients
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);

    // Look for a clickable client name - try different selectors
    const clientLink = page.locator("a, [role='link']").filter({ hasText: /סיון|גליל|לקוח/ }).first();
    console.log("Client links found:", await clientLink.count());

    if (await clientLink.count() > 0) {
      await clientLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/sidebar-3-client-detail.png", fullPage: true });
    }

    // List all visible links
    const allLinks = await page.locator("a").allTextContents();
    console.log("All links on page:", allLinks.slice(0, 20).join(" | "));
  });

  test("3. Find Tasks tab in client detail", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);

    // Click Clients sidebar
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);

    // Click on a client (first clickable row)
    const firstClient = page.locator("table tbody tr, .client-item, [data-testid*='client']").first();
    if (await firstClient.count() > 0) {
      await firstClient.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: "tests/sidebar-4-client-page.png", fullPage: true });

    // Look for tabs
    const tabs = page.locator("[role='tab'], button").filter({ hasText: /משימות|Tasks|סקירה|Overview/ });
    console.log("Tabs found:", await tabs.count());
    const tabTexts = await tabs.allTextContents();
    console.log("Tab texts:", tabTexts.join(" | "));
  });
});
