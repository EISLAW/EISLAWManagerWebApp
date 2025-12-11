import { test, expect } from "@playwright/test"

const BASE = "http://localhost:5173"

test("Full Template Generation Test - סיון בנימיני", async ({ page }) => {
  page.on("console", msg => console.log("Browser:", msg.text()))
  page.on("dialog", async dialog => {
    console.log("Dialog:", dialog.message())
    await dialog.accept()
  })

  // Navigate to clients list
  await page.goto(`${BASE}/#/clients`)
  await page.waitForLoadState("networkidle")
  await page.waitForSelector("table", { timeout: 15000 })
  console.log("Loaded clients list")

  // Find סיון בנימיני (note: partial match)
  const clientLink = page.locator("a[href*='/clients/']", { hasText: "סיון" })
  const count = await clientLink.count()
  console.log(`Found ${count} clients matching 'סיון'`)

  if (count > 0) {
    await clientLink.first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)
    console.log("Opened client card")

    // Click Documents button
    const docsBtn = page.locator("[data-testid='btn-documents']")
    if (await docsBtn.count() > 0) {
      await docsBtn.click()
      await page.waitForTimeout(2000)
      console.log("Clicked Documents button")

      // Check modal opened
      const modal = page.locator("[data-testid='template-picker-modal']")
      await expect(modal).toBeVisible({ timeout: 5000 })
      console.log("Template picker modal is visible")

      // Wait for templates to load
      await page.waitForTimeout(2000)

      // Check for templates
      const templateItems = modal.locator(".divide-y > button")
      const templateCount = await templateItems.count()
      console.log(`Found ${templateCount} templates`)

      if (templateCount > 0) {
        // Get first template name
        const firstTemplate = templateItems.first()
        const templateName = await firstTemplate.textContent()
        console.log(`First template: ${templateName?.substring(0, 50)}`)

        // Click to generate
        console.log("Clicking template to generate...")
        await firstTemplate.click()

        // Wait for generation
        await page.waitForTimeout(4000)

        // Check for status message
        const successMsg = modal.locator(".bg-emerald-50")
        const errorMsg = modal.locator(".bg-red-50")

        if (await successMsg.count() > 0) {
          const msg = await successMsg.textContent()
          console.log(`SUCCESS: ${msg}`)
        } else if (await errorMsg.count() > 0) {
          const msg = await errorMsg.textContent()
          console.log(`ERROR: ${msg}`)
        } else {
          console.log("No status message visible")
          // Check loading state
          const loading = modal.locator("text=Creating")
          if (await loading.count() > 0) {
            console.log("Still generating...")
            await page.waitForTimeout(3000)
          }
        }

        // Take screenshot
        await page.screenshot({ path: "/tmp/template-generation-result.png" })
        console.log("Screenshot saved to /tmp/template-generation-result.png")
      } else {
        // Check for "no templates" or "loading" state
        const noTemplates = modal.locator("text=לא נמצאו")
        const loading = modal.locator("text=טוען")

        if (await noTemplates.count() > 0) {
          console.log("No templates found message shown")
        } else if (await loading.count() > 0) {
          console.log("Still loading templates...")
        }

        // Get modal HTML for debugging
        const modalHtml = await modal.innerHTML()
        console.log(`Modal content length: ${modalHtml.length}`)
      }
    } else {
      console.log("Documents button not found")
    }
  } else {
    console.log("Client not found")
    // List available clients
    const clients = await page.locator("tbody tr td:first-child a").allTextContents()
    console.log("Available clients:", clients.slice(0, 5).join(", "))
  }
})
