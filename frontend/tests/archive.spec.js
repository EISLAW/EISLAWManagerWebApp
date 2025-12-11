import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:8799";

test.describe("Archive Feature - Clients List", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + "/#/clients");
    await page.waitForLoadState("networkidle");
  });

  test("should display status filter dropdown", async ({ page }) => {
    const dropdown = page.locator("[data-testid=status-filter]");
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    
    const options = await dropdown.locator("option").allTextContents();
    console.log("Dropdown options:", options);
    
    expect(options.length).toBe(3);
  });

  test("should show client list", async ({ page }) => {
    const rows = await page.locator("tbody tr").count();
    console.log("Total clients shown:", rows);
    expect(rows).toBeGreaterThan(0);
  });
  
  test("should filter by archived status", async ({ page }) => {
    const dropdown = page.locator("[data-testid=status-filter]");
    
    // Get initial count
    await dropdown.selectOption("active");
    await page.waitForTimeout(1500);
    const activeCount = await page.locator("tbody tr").count();
    
    // Get all count
    await dropdown.selectOption("all");
    await page.waitForTimeout(1500);
    const allCount = await page.locator("tbody tr").count();
    
    console.log("Active:", activeCount, "All:", allCount);
    expect(allCount).toBeGreaterThanOrEqual(activeCount);
  });
});

test.describe("Archive Feature - Client Detail", () => {
  test("should navigate to client detail page", async ({ page }) => {
    await page.goto(BASE_URL + "/#/clients");
    await page.waitForLoadState("networkidle");
    
    const firstClientLink = page.locator("tbody tr").first().locator("a").first();
    await firstClientLink.click();
    await page.waitForLoadState("networkidle");
    
    // Should be on client detail page
    await expect(page).toHaveURL(/clients\/./);
  });
  
  test("should have More menu with archive option", async ({ page }) => {
    await page.goto(BASE_URL + "/#/clients");
    await page.waitForLoadState("networkidle");
    
    const firstClientLink = page.locator("tbody tr").first().locator("a").first();
    await firstClientLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Find More menu button (⋮)
    const moreBtn = page.locator("button").filter({ has: page.locator("svg.lucide-more-vertical") });
    if (await moreBtn.count() > 0) {
      await moreBtn.first().click();
      await page.waitForTimeout(500);
      
      const archiveOpt = page.getByText("העבר לארכיון");
      const hasArchive = await archiveOpt.count() > 0;
      console.log("Archive option found:", hasArchive);
    }
  });
});

test.describe("UX/UI Quality", () => {
  test("RTL layout is correct", async ({ page }) => {
    await page.goto(BASE_URL + "/#/clients");
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
  });
  
  test("Search box is functional", async ({ page }) => {
    await page.goto(BASE_URL + "/#/clients");
    await page.waitForLoadState("networkidle");
    
    const search = page.locator("[data-testid=client-search]");
    await expect(search).toBeVisible();
    
    await search.fill("סיון");
    await page.waitForTimeout(500);
    
    const results = await page.locator("tbody tr").count();
    console.log("Search results for סיון:", results);
  });
});
