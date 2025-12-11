import { test, expect } from "@playwright/test";

test.describe("CTO - Find Contacts in Client Card Modal", () => {

  test("Open client card modal and find contacts", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);

    // Click first client
    await page.locator("table tbody tr a").first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "tests/contacts-modal-1-client.png", fullPage: true });

    // Click on "כרטיס לקוח" button
    const clientCardBtn = page.locator("[data-testid='open-client-card']");
    console.log("Client card button found:", await clientCardBtn.count());

    if (await clientCardBtn.count() > 0) {
      await clientCardBtn.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: "tests/contacts-modal-2-open.png", fullPage: true });

      // Now look for contacts section
      const modalContent = await page.textContent("[role='dialog'], .modal, .fixed.inset-0");
      console.log("Modal content length:", modalContent?.length);

      // Search for contacts-related text
      const hasContacts = modalContent?.includes("אנשי קשר");
      const hasContactsEn = modalContent?.includes("Contacts");
      const hasEmail = modalContent?.includes("@");
      const hasPhone = modalContent?.includes("טלפון");

      console.log("Modal has אנשי קשר:", hasContacts);
      console.log("Modal has Contacts:", hasContactsEn);
      console.log("Modal has email:", hasEmail);
      console.log("Modal has phone:", hasPhone);

      // Look for add contact button
      const addBtn = page.locator("[data-testid*='add'], [data-testid*='contact']");
      console.log("Add/contact buttons in modal:", await addBtn.count());

      // List all text in modal
      const allText = await page.locator("[role='dialog'] *").allTextContents();
      const filtered = allText.filter(t => t.trim().length > 0 && t.trim().length < 50);
      console.log("Modal texts:", filtered.slice(0, 30).join(" | "));

      // Look for input fields (might be contact form)
      const inputs = page.locator("[role='dialog'] input");
      console.log("Input fields in modal:", await inputs.count());

      await page.screenshot({ path: "tests/contacts-modal-3-content.png", fullPage: true });
    }
  });

  test("Check Overview tab for contacts widget", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);
    await page.locator("table tbody tr a").first().click();
    await page.waitForTimeout(2000);

    // Make sure we're on Overview tab
    const overviewTab = page.getByText("סקירה");
    if (await overviewTab.count() > 0) {
      await overviewTab.first().click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: "tests/contacts-overview-1.png", fullPage: true });

    // Look for sections/widgets on the page
    const sections = page.locator("section, .widget, .card, [class*='widget'], [class*='section']");
    console.log("Sections/widgets found:", await sections.count());

    // Look specifically for contacts
    const contactText = page.getByText(/אנשי קשר|איש קשר|Contact/i);
    console.log("Contact-related text:", await contactText.count());

    // Check page structure
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").allTextContents();
    console.log("Headings on page:", headings.join(" | "));
  });

  test("List all data-testid on client page", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);
    await page.locator("table tbody tr a").first().click();
    await page.waitForTimeout(2000);

    // Get all data-testid attributes
    const testIds = await page.locator("[data-testid]").evaluateAll(els =>
      els.map(e => e.getAttribute("data-testid"))
    );
    console.log("All data-testid values:", testIds.join(" | "));

    // Open client card
    await page.locator("[data-testid='open-client-card']").click();
    await page.waitForTimeout(2000);

    const modalTestIds = await page.locator("[data-testid]").evaluateAll(els =>
      els.map(e => e.getAttribute("data-testid"))
    );
    console.log("All data-testid (with modal):", modalTestIds.join(" | "));

    await page.screenshot({ path: "tests/contacts-testids.png", fullPage: true });
  });
});
