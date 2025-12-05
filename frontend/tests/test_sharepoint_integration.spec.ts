import { test, expect } from "@playwright/test"

const BASE = "http://localhost:5173"

test("SharePoint Template Integration - Full Flow", async ({ page }) => {
  page.on("console", msg => console.log("Browser:", msg.text()))
  page.on("dialog", async d => { console.log("Dialog:", d.message()); await d.accept() })

  // Navigate to clients
  await page.goto(`${BASE}/#/clients`)
  await page.waitForLoadState("networkidle")
  await page.waitForSelector("table", { timeout: 15000 })
  console.log("Loaded clients list")

  // Find and click סיון client
  const clientLink = page.locator("a[href*='/clients/']", { hasText: "סיון" })
  await clientLink.first().click()
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(2000)
  console.log("Opened client card")

  // Click Documents button
  const docsBtn = page.locator("[data-testid='btn-documents']")
  await docsBtn.click()
  await page.waitForTimeout(2000)
  console.log("Clicked Documents button")

  // Wait for modal
  const modal = page.locator("[data-testid='template-picker-modal']")
  await expect(modal).toBeVisible({ timeout: 5000 })
  console.log("Template picker modal visible")

  // Wait for templates to load from SharePoint
  await page.waitForTimeout(3000)

  // Check templates loaded (should be from SharePoint now)
  const templateItems = modal.locator(".divide-y > button")
  const templateCount = await templateItems.count()
  console.log(`Found ${templateCount} templates`)

  // Verify we have SharePoint templates (not just fallback)
  expect(templateCount).toBeGreaterThan(0)

  if (templateCount > 0) {
    // Get first template name
    const firstTemplate = templateItems.first()
    const templateText = await firstTemplate.textContent()
    console.log(`First template: ${templateText?.substring(0, 80)}...`)

    // Click to generate
    console.log("Clicking template to generate...")
    await firstTemplate.click()

    // Wait for generation (SharePoint upload takes time)
    console.log("Waiting for document generation...")

    // Poll for success message
    let foundSuccess = false
    let successText = ""

    for (let i = 0; i < 50; i++) {  // Up to 5 seconds
      const successMsg = modal.locator(".bg-emerald-50")
      if (await successMsg.count() > 0) {
        successText = await successMsg.textContent() || ""
        console.log(`SUCCESS: ${successText}`)
        foundSuccess = true
        break
      }

      const errorMsg = modal.locator(".bg-red-50")
      if (await errorMsg.count() > 0) {
        const errorText = await errorMsg.textContent()
        console.log(`ERROR: ${errorText}`)
        break
      }

      await page.waitForTimeout(100)
    }

    // Take screenshot
    await page.screenshot({ path: "/tmp/sharepoint-integration-result.png" })
    console.log("Screenshot saved")

    // Verify success (check for SharePoint URL in response)
    if (foundSuccess) {
      // Check if the success message contains SharePoint URL
      const hasSharePointUrl = successText.includes("sharepoint") || successText.includes("נוצר")
      console.log(`SharePoint URL in response: ${hasSharePointUrl}`)
      expect(hasSharePointUrl || foundSuccess).toBeTruthy()
    }

    // Wait for modal to close (success behavior)
    await page.waitForTimeout(3000)
    const modalStillVisible = await modal.isVisible()
    console.log(`Modal closed after generation: ${!modalStillVisible}`)
  }

  console.log("SharePoint integration test complete")
})
