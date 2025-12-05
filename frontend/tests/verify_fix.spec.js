import { test, expect } from "@playwright/test"

test("client page renders without gray screen", async ({ page }) => {
  // Navigate to a test client page
  await page.goto("/client/Test%20Client", { waitUntil: "domcontentloaded" })
  
  // Wait for React to hydrate
  await page.waitForTimeout(2000)
  
  // Take screenshot
  await page.screenshot({ path: "test-results/client_fix_verify.png", fullPage: true })
  
  // Check that body has content (not just gray)
  const bodyText = await page.locator("body").textContent()
  console.log("Page content length:", bodyText?.length || 0)
  
  // Page should have substantial content
  expect(bodyText?.length).toBeGreaterThan(50)
})
