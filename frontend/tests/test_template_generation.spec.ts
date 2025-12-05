import { test, expect } from "@playwright/test"

const BASE = "http://localhost:5173"

test("Template Generation Test", async ({ page }) => {
  // Track console and network
  page.on("console", msg => console.log("Browser:", msg.text()))
  page.on("dialog", async dialog => {
    console.log("Dialog:", dialog.message())
    await dialog.accept()
  })

  // Navigate to clients list
  await page.goto(`${BASE}/#/clients`)
  await page.waitForLoadState("networkidle")
  await page.waitForSelector("table", { timeout: 15000 })

  // Find and click on סיוון בנימיני
  const clientLink = page.locator("a", { hasText: "סיוון בנימיני" })
  const clientCount = await clientLink.count()
  console.log(`Found ${clientCount} links for סיוון בנימיני`)

  if (clientCount > 0) {
    await clientLink.first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)
    console.log("Opened client card for סיוון בנימיני")

    // Click the Documents button
    const docsBtn = page.locator("[data-testid='btn-documents']")
    if (await docsBtn.count() > 0) {
      await docsBtn.click()
      await page.waitForTimeout(2000)
      console.log("Clicked Documents button")

      // Check if template picker modal opened
      const modal = page.locator("[data-testid='template-picker-modal']")
      if (await modal.count() > 0) {
        console.log("Template picker modal is open")

        // Wait for templates to load
        await page.waitForTimeout(3000)

        // Take screenshot of modal
        await page.screenshot({ path: "/tmp/template-modal.png" })

        // Check modal content
        const modalHtml = await modal.innerHTML()
        console.log("Modal HTML length:", modalHtml.length)

        // Look for loading indicator
        const loading = page.locator("text=טוען טמפלייטים")
        if (await loading.count() > 0) {
          console.log("Still loading templates...")
          await page.waitForTimeout(5000)
        }

        // Look for no templates message
        const noTemplates = page.locator("text=לא נמצאו טמפלייטים")
        if (await noTemplates.count() > 0) {
          console.log("ERROR: No templates found")
        }

        // Look for template items - they are buttons inside divide-y
        const templateButtons = modal.locator(".divide-y button")
        const count = await templateButtons.count()
        console.log(`Found ${count} template buttons`)

        if (count > 0) {
          // Get first template info
          const firstTemplate = templateButtons.first()
          const templateText = await firstTemplate.textContent()
          console.log("First template:", templateText?.substring(0, 100))

          // Click to generate
          console.log("Clicking to generate document...")
          await firstTemplate.click()

          // Wait for generation
          await page.waitForTimeout(5000)

          // Check for success/error message
          const success = modal.locator(".bg-emerald-50")
          const error = modal.locator(".bg-red-50")

          if (await success.count() > 0) {
            const msg = await success.textContent()
            console.log("SUCCESS:", msg)
          } else if (await error.count() > 0) {
            const msg = await error.textContent()
            console.log("ERROR:", msg)
          } else {
            console.log("No status message found after clicking")
          }

          // Take final screenshot
          await page.screenshot({ path: "/tmp/template-result.png" })
        }
      } else {
        console.log("Template picker modal did not open")
      }
    } else {
      console.log("Documents button not found")
    }
  } else {
    console.log("Client not found, listing available clients...")
    const clients = await page.locator("tbody tr td:first-child").allTextContents()
    console.log("Available clients:", clients.slice(0, 10).join(", "))
  }
})
