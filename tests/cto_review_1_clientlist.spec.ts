import { test, expect } from "@playwright/test";

test.describe("CTO Review #1: Client List", () => {
  test("Clients page loads and displays client cards", async ({ page }) => {
    // Navigate to clients page
    await page.goto("http://localhost:5173/clients");
    
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    
    // Take screenshot of initial state
    await page.screenshot({ path: "cto-review-1-clientlist.png", fullPage: true });
    
    // Check the page title/header exists
    const pageHeader = page.locator("text=לקוחות").first();
    await expect(pageHeader).toBeVisible({ timeout: 10000 });
    
    // Check if client cards/rows are visible
    // Try different possible selectors
    const clientCards = page.locator("[data-testid=client-card], .client-card, table tbody tr, [class*=client]" );
    const cardCount = await clientCards.count();
    console.log("Found client elements: " + cardCount);
    
    // Should have at least 1 client
    expect(cardCount).toBeGreaterThan(0);
    
    // Log what we found
    const firstClient = clientCards.first();
    const text = await firstClient.textContent();
    console.log("First client text: " + text?.substring(0, 100));
  });
});
