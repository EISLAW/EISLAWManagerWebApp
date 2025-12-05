import { test, expect } from "@playwright/test"

const BASE = "http://localhost:5173"

test("Verify Template Generation Success Message", async ({ page }) => {
  page.on("console", msg => console.log("Browser:", msg.text()))
  page.on("dialog", async d => { console.log("Dialog:", d.message()); await d.accept() })

  await page.goto(`${BASE}/#/clients`)
  await page.waitForLoadState("networkidle")
  await page.waitForSelector("table", { timeout: 15000 })

  // Find and click client
  const clientLink = page.locator("a[href*='/clients/']", { hasText: "סיון" })
  await clientLink.first().click()
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(2000)

  // Click Documents button
  const docsBtn = page.locator("[data-testid='btn-documents']")
  await docsBtn.click()
  await page.waitForTimeout(1500)

  const modal = page.locator("[data-testid='template-picker-modal']")
  await expect(modal).toBeVisible()
  console.log("Modal opened")

  // Wait for templates
  await page.waitForTimeout(1500)

  // Click second template (מדיניות פרטיות)
  const templates = modal.locator(".divide-y > button")
  const count = await templates.count()
  console.log(`Templates count: ${count}`)

  // Click "מדיניות פרטיות" template (5th one)
  const privacyTemplate = modal.locator("button", { hasText: "מדיניות פרטיות" })
  if (await privacyTemplate.count() > 0) {
    console.log("Clicking 'מדיניות פרטיות' template...")
    await privacyTemplate.click()
  } else {
    // Click first template
    console.log("Clicking first template...")
    await templates.first().click()
  }

  // Wait and check for success message (green bg-emerald-50)
  // The modal closes after 1.5 seconds, so we need to catch it quickly
  const successMsg = modal.locator(".bg-emerald-50")

  // Poll for success message for up to 3 seconds
  let foundSuccess = false
  for (let i = 0; i < 30; i++) {
    if (await successMsg.count() > 0) {
      const msg = await successMsg.textContent()
      console.log(`SUCCESS MESSAGE FOUND: "${msg}"`)
      foundSuccess = true
      break
    }
    await page.waitForTimeout(100)
  }

  if (!foundSuccess) {
    // Check if modal closed (which means success)
    const modalStillVisible = await modal.isVisible()
    if (!modalStillVisible) {
      console.log("Modal closed - generation completed successfully")
    } else {
      // Check for error
      const errorMsg = modal.locator(".bg-red-50")
      if (await errorMsg.count() > 0) {
        const err = await errorMsg.textContent()
        console.log(`ERROR: ${err}`)
      }
    }
  }

  // Take final screenshot
  await page.screenshot({ path: "/tmp/template-verify-result.png" })

  // Verify modal eventually closes (success behavior)
  await page.waitForTimeout(3000)
  const finalModalVisible = await modal.isVisible()
  console.log(`Modal still visible after 3s: ${finalModalVisible}`)

  expect(foundSuccess || !finalModalVisible).toBeTruthy()
})
