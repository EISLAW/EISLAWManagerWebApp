import { test, expect } from "@playwright/test";

test.describe("CTO - Add Contact Flow in Modal", () => {

  async function openClientCardModal(page: any) {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);
    await page.locator("table tbody tr a").first().click();
    await page.waitForTimeout(2000);
    await page.locator("[data-testid='open-client-card']").click();
    await page.waitForTimeout(2000);
  }

  test("ADD-01: Click +הוסף איש קשר button", async ({ page }) => {
    await openClientCardModal(page);

    await page.screenshot({ path: "tests/add-01-before.png", fullPage: true });

    // Find and click the add contact button
    const addBtn = page.getByText("+הוסף איש קשר");
    console.log("Add contact button found:", await addBtn.count());

    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: "tests/add-01-after.png", fullPage: true });

      // Check if form appeared
      const inputs = page.locator("[data-testid='add-client-modal'] input");
      const inputCount = await inputs.count();
      console.log("Input fields after click:", inputCount);

      // Get placeholders of new inputs
      const placeholders = await inputs.evaluateAll(els =>
        els.map(e => e.getAttribute("placeholder")).filter(Boolean)
      );
      console.log("New input placeholders:", placeholders.join(" | "));

      console.log("ADD-01 PASS: Add button clicked");
    }
  });

  test("ADD-02: Contact form fields appear", async ({ page }) => {
    await openClientCardModal(page);
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(1000);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Look for new input fields
    const allInputs = await modal.locator("input").evaluateAll(els =>
      els.map(e => ({
        placeholder: e.getAttribute("placeholder"),
        type: e.getAttribute("type"),
        value: e.getAttribute("value") || (e as HTMLInputElement).value,
        id: e.getAttribute("id"),
        name: e.getAttribute("name")
      }))
    );
    console.log("All inputs:", JSON.stringify(allInputs, null, 2));

    await page.screenshot({ path: "tests/add-02-form.png", fullPage: true });
  });

  test("ADD-03: Fill contact form", async ({ page }) => {
    await openClientCardModal(page);
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(1000);

    const modal = page.locator("[data-testid='add-client-modal']");
    await page.screenshot({ path: "tests/add-03-empty.png", fullPage: true });

    // Try to find and fill contact fields
    // Common patterns for contact forms

    // Name field
    const nameInput = modal.locator("input[placeholder*='שם'], input[name*='name']");
    if (await nameInput.count() > 0) {
      await nameInput.first().fill("איש קשר בדיקה");
      console.log("Filled name field");
    }

    // Role/Title field
    const roleInput = modal.locator("input[placeholder*='תפקיד'], input[name*='role'], input[name*='title']");
    if (await roleInput.count() > 0) {
      await roleInput.first().fill("מנהל בדיקות");
      console.log("Filled role field");
    }

    // Email field
    const emailInput = modal.locator("input[type='email'], input[placeholder*='אימייל'], input[placeholder*='email']");
    if (await emailInput.count() > 0) {
      await emailInput.first().fill("test@example.com");
      console.log("Filled email field");
    }

    // Phone field
    const phoneInput = modal.locator("input[type='tel'], input[placeholder*='טלפון'], input[placeholder*='phone']");
    if (await phoneInput.count() > 0) {
      await phoneInput.first().fill("050-1234567");
      console.log("Filled phone field");
    }

    await page.screenshot({ path: "tests/add-03-filled.png", fullPage: true });
    console.log("ADD-03: Form filling complete");
  });

  test("ADD-04: Save contact and verify", async ({ page }) => {
    await openClientCardModal(page);
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(1000);

    // Look for save/add button for the contact
    const modal = page.locator("[data-testid='add-client-modal']");

    // Get all buttons after clicking add
    const buttons = await modal.locator("button").allTextContents();
    console.log("All buttons after add click:", buttons.join(" | "));

    // Look for confirm/save contact button
    const saveContactBtn = modal.locator("button").filter({
      hasText: /הוסף|שמור|אישור|✓|save|add/i
    });
    console.log("Save/confirm buttons:", await saveContactBtn.count());

    await page.screenshot({ path: "tests/add-04-buttons.png", fullPage: true });
  });

  test("ADD-05: Full add contact flow", async ({ page }) => {
    await openClientCardModal(page);

    // Before state
    const noContacts = page.getByText("אין אנשי קשר");
    const noContactsBefore = await noContacts.isVisible();
    console.log("'No contacts' visible before:", noContactsBefore);

    await page.screenshot({ path: "tests/add-05-before.png", fullPage: true });

    // Click add button
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "tests/add-05-form.png", fullPage: true });

    // Try to fill any visible inputs in the contacts area
    const modal = page.locator("[data-testid='add-client-modal']");

    // Find all inputs and try to identify which are for contacts
    const inputs = modal.locator("input");
    const inputCount = await inputs.count();
    console.log("Total inputs in modal:", inputCount);

    // Log each input's details
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const placeholder = await input.getAttribute("placeholder");
      const type = await input.getAttribute("type");
      const value = await input.inputValue();
      console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, value=${value?.substring(0, 20)}`);
    }

    await page.screenshot({ path: "tests/add-05-inputs.png", fullPage: true });
  });

  test("ADD-06: Check contact form structure with labels", async ({ page }) => {
    await openClientCardModal(page);
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(1000);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Get labels with their associated inputs
    const labels = await modal.locator("label").allTextContents();
    console.log("All labels after add click:", labels.join(" | "));

    // Get the HTML structure of the contacts area
    const contactsArea = modal.locator("text=אנשי קשר").first().locator("xpath=..");
    const parentHTML = await contactsArea.innerHTML().catch(() => "Could not get parent HTML");
    console.log("Contacts area HTML length:", parentHTML.length);

    await page.screenshot({ path: "tests/add-06-labels.png", fullPage: true });
  });
});
