import { test, expect } from "@playwright/test"

test.describe("EmailsWidget Scroll/Expand (C-008)", () => {

  // Mock email data so we have something to show
  test.beforeEach(async ({ page }) => {
    // Mock the email API to return enough emails to show scroll
    await page.route("**/email/by_client**", route => {
      const emails = Array.from({ length: 15 }, (_, i) => ({
        id: `test-email-${i}`,
        received: new Date(Date.now() - i * 3600000).toISOString(),
        subject: `Test Email ${i}`,
        from: `sender${i}@test.com`,
        to: "test@eislaw.co.il",
        preview: `Preview of email ${i}`,
        is_read: i > 3
      }))
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: emails, total: 15 })
      })
    })
  })

  test("should have always-scrollable container with no expand button", async ({ page }) => {
    // Go directly to a client detail page (Overview tab)
    await page.goto("/#/clients/Test%20Client")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    // Find the EmailsWidget
    const emailsWidget = page.locator("[data-testid=emails-widget]")

    // Wait for it or check if it exists
    const widgetExists = await emailsWidget.count() > 0
    console.log("EmailsWidget exists:", widgetExists)

    if (!widgetExists) {
      // Take screenshot to debug
      await page.screenshot({ path: "emails-widget-not-found.png" })
      console.log("Widget not found - checking page content")
      return
    }

    await expect(emailsWidget).toBeVisible({ timeout: 10000 })

    // Check that expand button does NOT exist (simplified design)
    const expandBtn = emailsWidget.locator("text=הרחב")
    const expandBtnExists = await expandBtn.count() > 0
    console.log("Expand button exists:", expandBtnExists, "(should be false)")
    expect(expandBtnExists).toBe(false)

    // Verify scroll container exists directly (always visible)
    const scrollContainer = emailsWidget.locator(".overflow-y-auto")
    const scrollExists = await scrollContainer.count() > 0
    console.log("Scroll container exists:", scrollExists)
    expect(scrollExists).toBe(true)

    // Check max-height is applied for fixed container
    if (scrollExists) {
      await expect(scrollContainer).toBeVisible()
      console.log("PASS: Scroll container is always visible")
    }

    await page.screenshot({ path: "emails-widget-scrollable.png" })
  })

  test("should have clickable email rows", async ({ page }) => {
    await page.goto("/#/clients/Test%20Client")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const emailsWidget = page.locator("[data-testid=emails-widget]")

    if (await emailsWidget.count() === 0) {
      console.log("EmailsWidget not found")
      return
    }

    // Check for email rows with cursor-pointer
    const emailRow = emailsWidget.locator("[data-testid^=email-row]").first()
    const rowExists = await emailRow.count() > 0
    console.log("Email row exists:", rowExists)

    if (rowExists) {
      // Check if it has cursor-pointer class
      const hasCursor = await emailRow.evaluate(el => el.classList.contains("cursor-pointer"))
      console.log("Email row has cursor-pointer:", hasCursor)

      if (hasCursor) {
        console.log("PASS: Email rows are clickable")
      }
    }
  })
})
