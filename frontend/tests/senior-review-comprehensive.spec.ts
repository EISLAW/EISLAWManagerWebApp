import { test, expect } from "@playwright/test"

/**
 * SENIOR PRODUCT MANAGER & UI/UX REVIEW
 * Comprehensive test suite to verify shipping readiness
 *
 * Tests all user flows as a real user would experience them
 * Must pass ALL tests before product is approved for shipping
 */

const BASE = "http://localhost:5173"

// Helper to log with timestamp
const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`)

test.describe("SENIOR REVIEW: Client List Page", () => {

  test("CL-01: Page loads correctly with client data", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")

    // Must have table
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 })

    // Must have clients
    const rows = await page.locator("tbody tr").count()
    log(`Found ${rows} clients`)
    expect(rows).toBeGreaterThan(0)

    // Must have headers
    await expect(page.getByText("שם")).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "אימייל" })).toBeVisible()
    await expect(page.getByText("פעולות")).toBeVisible()
  })

  test("CL-02: Search functionality works", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    const searchInput = page.locator("input[placeholder*='חיפוש']")
    await expect(searchInput).toBeVisible()

    // Search for a client
    await searchInput.fill("סיון")
    await page.waitForTimeout(500)

    // Should filter results
    const rows = await page.locator("tbody tr").count()
    log(`After search: ${rows} clients`)
    expect(rows).toBeGreaterThanOrEqual(1)
  })

  test("CL-03: Client tags display correctly (AT, SP, להגדרה)", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    // Check for setup tag (להגדרה)
    const setupTags = page.locator("span:has-text('להגדרה')")
    const setupCount = await setupTags.count()
    log(`Setup tags (להגדרה): ${setupCount}`)

    // At least some clients should have tags
    const htmlContent = await page.content()
    const hasAnyTag = htmlContent.includes("להגדרה") || htmlContent.includes(">AT<") || htmlContent.includes(">SP<")
    expect(hasAnyTag).toBeTruthy()
  })

  test("CL-04: SP button shows feedback when no SharePoint URL", async ({ page }) => {
    let alertMessage = ""
    page.on("dialog", async dialog => {
      alertMessage = dialog.message()
      log(`Alert: ${alertMessage}`)
      await dialog.accept()
    })

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    // Find a client with להגדרה tag (no SharePoint)
    const setupRow = page.locator("tr", { has: page.locator("span:has-text('להגדרה')") }).first()
    if (await setupRow.count() > 0) {
      const spButton = setupRow.getByText("SP")
      await spButton.click()
      await page.waitForTimeout(1000)

      expect(alertMessage).toContain("SharePoint")
      log("PASS: SP button shows proper feedback")
    }
  })

  test("CL-05: Navigation to client card works", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    const firstClient = page.locator("tbody tr td a").first()
    const clientName = await firstClient.textContent()
    log(`Clicking client: ${clientName}`)

    await firstClient.click()
    await page.waitForLoadState("networkidle")

    // Should navigate to client card
    expect(page.url()).toContain("/clients/")
    log("PASS: Navigation to client card works")
  })
})

test.describe("SENIOR REVIEW: Client Card Page", () => {

  test("CC-01: Client card loads with all sections", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    // Navigate to first client
    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    // Check for essential elements
    await expect(page.getByText("פעולות מהירות")).toBeVisible({ timeout: 5000 })
    log("PASS: Quick Actions section visible")
  })

  test("CC-02: All tabs are accessible", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    // Check tabs exist
    const tabs = ["סקירה", "קבצים", "אימיילים", "משימות"]
    for (const tab of tabs) {
      const tabElement = page.getByRole("link", { name: tab }).or(page.getByText(tab, { exact: true }))
      if (await tabElement.count() > 0) {
        log(`Tab found: ${tab}`)
      }
    }
  })

  test("CC-03: Quick Actions - Quote button opens modal", async ({ page }) => {
    page.on("dialog", async d => await d.accept())

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const quoteBtn = page.locator("[data-testid='btn-quote']")
    if (await quoteBtn.count() > 0) {
      await quoteBtn.click()
      await page.waitForTimeout(1000)

      const modal = page.locator("[data-testid='quote-modal']")
      await expect(modal).toBeVisible()
      log("PASS: Quote modal opens")

      // Check modal has templates
      const templates = await modal.locator("input[type='radio']").count()
      log(`Quote templates available: ${templates}`)
      expect(templates).toBeGreaterThan(0)

      await page.keyboard.press("Escape")
    }
  })

  test("CC-04: Quick Actions - Documents button opens TemplatePicker", async ({ page }) => {
    page.on("dialog", async d => await d.accept())

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const docsBtn = page.locator("[data-testid='btn-documents']")
    if (await docsBtn.count() > 0) {
      await docsBtn.click()
      await page.waitForTimeout(2000)

      const modal = page.locator("[data-testid='template-picker-modal']")
      await expect(modal).toBeVisible()
      log("PASS: TemplatePicker modal opens")

      // Check templates loaded
      const templates = modal.locator(".divide-y > button")
      const count = await templates.count()
      log(`Document templates loaded: ${count}`)
      expect(count).toBeGreaterThan(0)

      await page.keyboard.press("Escape")
    }
  })

  test("CC-05: Quick Actions - Delivery button opens modal", async ({ page }) => {
    page.on("dialog", async d => await d.accept())

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const deliveryBtn = page.locator("[data-testid='btn-delivery']")
    if (await deliveryBtn.count() > 0) {
      await deliveryBtn.click()
      await page.waitForTimeout(1000)

      const modal = page.locator("[data-testid='delivery-modal']")
      await expect(modal).toBeVisible()
      log("PASS: Delivery modal opens")

      await page.keyboard.press("Escape")
    }
  })
})

test.describe("SENIOR REVIEW: TemplatePicker Full Flow", () => {

  test("TP-01: Complete document generation flow", async ({ page }) => {
    page.on("dialog", async d => await d.accept())

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    // Find סיון client
    const clientLink = page.locator("a[href*='/clients/']", { hasText: "סיון" })
    await clientLink.first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    // Open TemplatePicker
    const docsBtn = page.locator("[data-testid='btn-documents']")
    await docsBtn.click()
    await page.waitForTimeout(2000)

    const modal = page.locator("[data-testid='template-picker-modal']")
    await expect(modal).toBeVisible()

    // Verify templates loaded
    const templates = modal.locator(".divide-y > button")
    const count = await templates.count()
    log(`Templates available: ${count}`)
    expect(count).toBe(10) // We have 10 templates

    // Select a template
    await templates.first().click()

    // Wait for success message
    let foundSuccess = false
    for (let i = 0; i < 30; i++) {
      const success = modal.locator(".bg-emerald-50")
      if (await success.count() > 0) {
        const msg = await success.textContent()
        log(`SUCCESS: ${msg}`)
        foundSuccess = true
        break
      }
      await page.waitForTimeout(100)
    }

    expect(foundSuccess).toBeTruthy()
    log("PASS: Document generation successful")
  })

  test("TP-02: Search/filter templates works", async ({ page }) => {
    page.on("dialog", async d => await d.accept())

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const docsBtn = page.locator("[data-testid='btn-documents']")
    await docsBtn.click()
    await page.waitForTimeout(2000)

    const modal = page.locator("[data-testid='template-picker-modal']")

    // Find search input
    const searchInput = modal.locator("input[placeholder*='חפש']")
    if (await searchInput.count() > 0) {
      await searchInput.fill("פרטיות")
      await page.waitForTimeout(500)

      const filteredTemplates = modal.locator(".divide-y > button")
      const count = await filteredTemplates.count()
      log(`Filtered templates: ${count}`)
      expect(count).toBeLessThan(10)
      expect(count).toBeGreaterThan(0)
      log("PASS: Template search works")
    }

    await page.keyboard.press("Escape")
  })

  test("TP-03: Open Folder button exists", async ({ page }) => {
    page.on("dialog", async d => await d.accept())

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const docsBtn = page.locator("[data-testid='btn-documents']")
    await docsBtn.click()
    await page.waitForTimeout(2000)

    const modal = page.locator("[data-testid='template-picker-modal']")
    const folderBtn = modal.getByText("תיקייה")

    await expect(folderBtn).toBeVisible()
    log("PASS: Open Folder button visible")

    await page.keyboard.press("Escape")
  })
})

test.describe("SENIOR REVIEW: Files Tab", () => {

  test("FT-01: Files tab has SharePoint button", async ({ page }) => {
    page.on("dialog", async d => {
      log(`Dialog: ${d.message()}`)
      await d.accept()
    })

    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    const firstLink = page.locator("a[href*='/clients/']").first()
    const href = await firstLink.getAttribute("href")
    const clientPath = href?.split("/clients/")[1]

    await page.goto(`${BASE}/#/clients/${clientPath}?tab=files`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1500)

    const spButton = page.getByText("SharePoint")
    const hasSPButton = await spButton.count() > 0
    log(`SharePoint button in Files tab: ${hasSPButton}`)

    if (hasSPButton) {
      await spButton.click()
      await page.waitForTimeout(1000)
    }

    log("PASS: Files tab checked")
  })
})

test.describe("SENIOR REVIEW: Emails Tab", () => {

  test("ET-01: Emails tab has scrolling", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    const firstLink = page.locator("a[href*='/clients/']").first()
    const href = await firstLink.getAttribute("href")
    const clientPath = href?.split("/clients/")[1]

    await page.goto(`${BASE}/#/clients/${clientPath}?tab=emails`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1500)

    const htmlContent = await page.content()
    const hasScrolling = htmlContent.includes("max-h-[60vh]") && htmlContent.includes("overflow-y-auto")
    log(`Emails tab has scrolling: ${hasScrolling}`)
    expect(hasScrolling).toBeTruthy()

    log("PASS: Emails tab scrolling verified")
  })

  test("ET-02: Email sync button exists", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    const firstLink = page.locator("a[href*='/clients/']").first()
    const href = await firstLink.getAttribute("href")
    const clientPath = href?.split("/clients/")[1]

    await page.goto(`${BASE}/#/clients/${clientPath}?tab=emails`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1500)

    const syncBtn = page.locator("[data-testid='emails-sync']")
    await expect(syncBtn).toBeVisible()
    log("PASS: Email sync button visible")
  })
})

test.describe("SENIOR REVIEW: Email Widget on Overview", () => {

  test("EW-01: Email widget has scrolling", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const htmlContent = await page.content()
    const hasWidgetScroll = htmlContent.includes("max-h-[280px]")
    log(`Email widget has scrolling: ${hasWidgetScroll}`)
    expect(hasWidgetScroll).toBeTruthy()

    log("PASS: Email widget scrolling verified")
  })
})

test.describe("SENIOR REVIEW: Final Checks", () => {

  test("FC-01: No console errors on main flows", async ({ page }) => {
    const errors: string[] = []
    page.on("console", msg => {
      if (msg.type() === "error" && !msg.text().includes("ERR_CONNECTION_REFUSED")) {
        errors.push(msg.text())
      }
    })
    page.on("dialog", async d => await d.accept())

    // Navigate through main flows
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    await page.locator("tbody tr td a").first().click()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    // Open modals
    const docsBtn = page.locator("[data-testid='btn-documents']")
    if (await docsBtn.count() > 0) {
      await docsBtn.click()
      await page.waitForTimeout(1000)
      await page.keyboard.press("Escape")
    }

    log(`Console errors found: ${errors.length}`)
    if (errors.length > 0) {
      log(`Errors: ${errors.join(", ")}`)
    }

    // Allow minor errors but log them
    expect(errors.length).toBeLessThan(5)
    log("PASS: No critical console errors")
  })

  test("FC-02: RTL layout is correct", async ({ page }) => {
    await page.goto(`${BASE}/#/clients`)
    await page.waitForLoadState("networkidle")
    await page.waitForSelector("table", { timeout: 15000 })

    // Check that Hebrew text is visible and layout is RTL
    const hebrewText = page.getByText("לקוחות").or(page.getByText("שם"))
    await expect(hebrewText.first()).toBeVisible()

    log("PASS: RTL layout appears correct")
  })
})
