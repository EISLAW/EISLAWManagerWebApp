import { test, expect } from "@playwright/test";

test.describe("CTO Full Client Card Review - Every Button, Every Feature", () => {

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

  test("FULL-01: Map ALL interactive elements in Client Card", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Get ALL buttons
    const buttons = await modal.locator("button").evaluateAll(els =>
      els.map(e => ({
        text: e.textContent?.trim().substring(0, 40),
        testId: e.getAttribute("data-testid"),
        disabled: e.hasAttribute("disabled"),
        ariaLabel: e.getAttribute("aria-label"),
        className: e.className.substring(0, 50)
      }))
    );
    console.log("=== ALL BUTTONS ===");
    buttons.forEach((b, i) => console.log(`Button ${i}: ${JSON.stringify(b)}`));

    // Get ALL inputs
    const inputs = await modal.locator("input, textarea, select").evaluateAll(els =>
      els.map(e => ({
        type: e.getAttribute("type") || e.tagName.toLowerCase(),
        placeholder: e.getAttribute("placeholder"),
        name: e.getAttribute("name"),
        value: (e as HTMLInputElement).value?.substring(0, 30),
        required: e.hasAttribute("required"),
        disabled: e.hasAttribute("disabled")
      }))
    );
    console.log("=== ALL INPUTS ===");
    inputs.forEach((inp, i) => console.log(`Input ${i}: ${JSON.stringify(inp)}`));

    // Get ALL labels
    const labels = await modal.locator("label").allTextContents();
    console.log("=== ALL LABELS ===");
    console.log(labels.join(" | "));

    // Get ALL links
    const links = await modal.locator("a").evaluateAll(els =>
      els.map(e => ({
        text: e.textContent?.trim().substring(0, 30),
        href: e.getAttribute("href")?.substring(0, 50)
      }))
    );
    console.log("=== ALL LINKS ===");
    links.forEach((l, i) => console.log(`Link ${i}: ${JSON.stringify(l)}`));

    await page.screenshot({ path: "tests/full-01-all-elements.png", fullPage: true });
  });

  test("FULL-02: Test שם לקוח (Client Name) field", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const nameInput = modal.locator("input").first();

    const originalValue = await nameInput.inputValue();
    console.log("Original client name:", originalValue);

    // Try to edit
    await nameInput.clear();
    await nameInput.fill("Test Name Change");
    console.log("Changed to: Test Name Change");

    // Check if save button enables
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");
    const isDisabled = await saveBtn.isDisabled();
    console.log("Save button disabled after name change:", isDisabled);

    await page.screenshot({ path: "tests/full-02-name-field.png", fullPage: true });

    // Restore original
    await nameInput.clear();
    await nameInput.fill(originalValue);
  });

  test("FULL-03: Test אימייל (Email) field", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Find email input - look for the one after the name
    const inputs = modal.locator("input");
    const emailInput = inputs.nth(0); // First input after labels

    // Get current value and label
    const labels = await modal.locator("label").allTextContents();
    console.log("Labels:", labels.slice(0, 5).join(" | "));

    // Try to find by looking at structure
    const emailLabel = modal.getByText("אימייל *");
    console.log("Email label found:", await emailLabel.count());

    await page.screenshot({ path: "tests/full-03-email-field.png", fullPage: true });
  });

  test("FULL-04: Test טלפון (Phone) field", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const phoneInput = modal.locator("input[type='tel']").first();

    if (await phoneInput.count() > 0) {
      const originalValue = await phoneInput.inputValue();
      console.log("Original phone:", originalValue);

      // Edit phone
      await phoneInput.clear();
      await phoneInput.fill("052-9999999");
      console.log("Changed to: 052-9999999");

      const newValue = await phoneInput.inputValue();
      console.log("New value:", newValue);

      await page.screenshot({ path: "tests/full-04-phone-field.png", fullPage: true });
    } else {
      console.log("Phone input not found");
    }
  });

  test("FULL-05: Test סטטוס (Status) dropdown/buttons", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Status options based on earlier test: חדש, בתהליך, ממתין, הושלם
    const statusOptions = ["חדש", "בתהליך", "ממתין", "הושלם"];

    for (const status of statusOptions) {
      const statusBtn = modal.getByText(status, { exact: true });
      if (await statusBtn.count() > 0) {
        console.log(`Status option '${status}' found`);
      }
    }

    // Try clicking a status
    const statusBtn = modal.getByText("בתהליך", { exact: true });
    if (await statusBtn.count() > 0) {
      await statusBtn.click();
      await page.waitForTimeout(500);
      console.log("Clicked 'בתהליך' status");
      await page.screenshot({ path: "tests/full-05-status.png", fullPage: true });
    }
  });

  test("FULL-06: Test סוג לקוח (Client Type) buttons", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Client types from earlier: בטיפול, ריטיינר, ליטיגציה, טיפול הושלם, פוטנציאלי
    const typeOptions = ["בטיפול", "ריטיינר", "ליטיגציה", "טיפול הושלם", "פוטנציאלי"];

    for (const type of typeOptions) {
      const typeBtn = modal.getByRole("button", { name: type });
      if (await typeBtn.count() > 0) {
        console.log(`Type option '${type}' found as button`);
      }
    }

    // Click each type button and verify selection
    for (const type of typeOptions) {
      const typeBtn = modal.getByRole("button", { name: type });
      if (await typeBtn.count() > 0 && await typeBtn.isVisible()) {
        await typeBtn.click();
        await page.waitForTimeout(300);
        console.log(`Clicked '${type}' type button`);
      }
    }

    await page.screenshot({ path: "tests/full-06-client-type.png", fullPage: true });
  });

  test("FULL-07: Test הערות (Notes) textarea", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Look for notes textarea
    const textarea = modal.locator("textarea");
    console.log("Textarea count:", await textarea.count());

    if (await textarea.count() > 0) {
      const originalValue = await textarea.inputValue();
      console.log("Original notes:", originalValue?.substring(0, 50));

      // Add some text
      await textarea.fill("Test notes from CTO review");
      console.log("Added test notes");

      await page.screenshot({ path: "tests/full-07-notes.png", fullPage: true });

      // Restore
      await textarea.fill(originalValue);
    }
  });

  test("FULL-08: Test תיקייה (Folder) section - עיין button", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Look for folder section and עיין (browse) button
    const browseBtn = modal.getByRole("button", { name: "עיין" });
    console.log("Browse button found:", await browseBtn.count());

    if (await browseBtn.count() > 0) {
      // Check folder status before click
      const folderText = modal.getByText("לא נבחרה תיקייה");
      console.log("'No folder selected' visible:", await folderText.isVisible());

      await browseBtn.click();
      await page.waitForTimeout(2000);
      console.log("Clicked browse button");

      await page.screenshot({ path: "tests/full-08-folder-browse.png", fullPage: true });

      // Check if folder picker opened (might be a modal or popup)
      const folderPicker = page.locator("[role='dialog']").last();
      const pickerVisible = await folderPicker.isVisible();
      console.log("Folder picker opened:", pickerVisible);
    }
  });

  test("FULL-09: Test Airtable link status", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Look for Airtable section
    const airtableText = modal.getByText(/Airtable|מזהה Airtable/);
    console.log("Airtable text found:", await airtableText.count());

    // Check link status
    const linkedText = modal.getByText("מקושר");
    const notLinkedText = modal.getByText("לא מקושר");

    console.log("'Linked' visible:", await linkedText.isVisible());
    console.log("'Not linked' visible:", await notLinkedText.isVisible());

    await page.screenshot({ path: "tests/full-09-airtable.png", fullPage: true });
  });

  test("FULL-10: Test ✕ (Close) button", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const modalVisible = await modal.isVisible();
    console.log("Modal visible before close:", modalVisible);

    // Click close button
    const closeBtn = modal.getByRole("button", { name: "✕" });
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(1000);

      const modalVisibleAfter = await modal.isVisible().catch(() => false);
      console.log("Modal visible after close:", modalVisibleAfter);

      if (!modalVisibleAfter) {
        console.log("FULL-10 PASS: Close button works");
      }
    }

    await page.screenshot({ path: "tests/full-10-close.png", fullPage: true });
  });

  test("FULL-11: Test ביטול (Cancel) button", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Make a change first
    const nameInput = modal.locator("input").first();
    const originalValue = await nameInput.inputValue();
    await nameInput.fill("Changed Name For Cancel Test");

    // Click cancel
    const cancelBtn = modal.locator("[data-testid='client-modal-cancel']");
    console.log("Cancel button found:", await cancelBtn.count());

    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
      await page.waitForTimeout(1000);

      const modalVisibleAfter = await modal.isVisible().catch(() => false);
      console.log("Modal visible after cancel:", modalVisibleAfter);

      // Reopen and check if changes were discarded
      if (!modalVisibleAfter) {
        await page.locator("[data-testid='open-client-card']").click();
        await page.waitForTimeout(1000);

        const newValue = await modal.locator("input").first().inputValue();
        console.log("Name after cancel:", newValue);
        console.log("Changes discarded:", newValue === originalValue);
      }
    }

    await page.screenshot({ path: "tests/full-11-cancel.png", fullPage: true });
  });

  test("FULL-12: Test שמור שינויים (Save Changes) button", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");

    // Check initial state
    const isDisabled = await saveBtn.isDisabled();
    console.log("Save button disabled initially:", isDisabled);

    // Make a change to enable save
    const textarea = modal.locator("textarea");
    if (await textarea.count() > 0) {
      const original = await textarea.inputValue();
      await textarea.fill(original + " - test change");

      await page.waitForTimeout(500);
      const isDisabledAfter = await saveBtn.isDisabled();
      console.log("Save button disabled after change:", isDisabledAfter);

      // Restore
      await textarea.fill(original);
    }

    await page.screenshot({ path: "tests/full-12-save.png", fullPage: true });
  });

  test("FULL-13: Test all contact action buttons", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // First add a contact if none exists
    const noContacts = await modal.getByText("אין אנשי קשר").isVisible();
    if (noContacts) {
      await modal.getByText("+הוסף איש קשר").click();
      await page.waitForTimeout(500);
      await modal.locator("input[placeholder='שם מלא']").fill("Test Contact Actions");
      await modal.locator("input[placeholder='תפקיד']").fill("Tester");
      await modal.getByRole("button", { name: "שמור" }).first().click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: "tests/full-13-contact-actions.png", fullPage: true });

    // Now test the action buttons on the contact
    // ☆ Star (primary)
    const starBtn = modal.getByText("☆");
    console.log("Star button found:", await starBtn.count());
    if (await starBtn.count() > 0) {
      await starBtn.first().click();
      await page.waitForTimeout(500);
      console.log("Clicked star button");
    }

    // ✏️ Edit
    const editBtn = modal.getByText("✏️");
    console.log("Edit button found:", await editBtn.count());
    if (await editBtn.count() > 0) {
      await editBtn.first().click();
      await page.waitForTimeout(500);
      console.log("Clicked edit button");
      await page.screenshot({ path: "tests/full-13-edit-mode.png", fullPage: true });
    }

    // 🗑️ Delete
    const deleteBtn = modal.getByText("🗑️");
    console.log("Delete button found:", await deleteBtn.count());
    // Don't actually delete, just verify it exists
  });

  test("FULL-14: Identify REDUNDANT elements", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Get all button texts to find duplicates
    const buttonTexts = await modal.locator("button").allTextContents();
    const buttonCounts: Record<string, number> = {};
    buttonTexts.forEach(text => {
      const cleanText = text.trim();
      if (cleanText) {
        buttonCounts[cleanText] = (buttonCounts[cleanText] || 0) + 1;
      }
    });

    console.log("=== Button Frequency ===");
    Object.entries(buttonCounts)
      .filter(([_, count]) => count > 1)
      .forEach(([text, count]) => {
        console.log(`DUPLICATE: '${text}' appears ${count} times`);
      });

    // Check for hidden/invisible elements
    const allButtons = await modal.locator("button").all();
    let hiddenCount = 0;
    for (const btn of allButtons) {
      const isVisible = await btn.isVisible();
      if (!isVisible) {
        hiddenCount++;
      }
    }
    console.log("Hidden buttons:", hiddenCount);

    // Check for disabled elements
    const disabledButtons = await modal.locator("button:disabled").count();
    console.log("Disabled buttons:", disabledButtons);

    await page.screenshot({ path: "tests/full-14-redundant.png", fullPage: true });
  });

  test("FULL-15: Test scrolling in modal", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Get modal dimensions
    const box = await modal.boundingBox();
    console.log("Modal dimensions:", box);

    // Check if modal is scrollable
    const scrollHeight = await modal.evaluate(el => el.scrollHeight);
    const clientHeight = await modal.evaluate(el => el.clientHeight);
    console.log("Scroll height:", scrollHeight);
    console.log("Client height:", clientHeight);
    console.log("Is scrollable:", scrollHeight > clientHeight);

    // Scroll to bottom
    await modal.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "tests/full-15-scrolled.png", fullPage: true });

    // Scroll back to top
    await modal.evaluate(el => el.scrollTo(0, 0));
  });

  test("FULL-16: Test keyboard navigation", async ({ page }) => {
    await openClientCardModal(page);

    // Press Tab to navigate through fields
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: "tests/full-16-keyboard.png", fullPage: true });

    // Press Escape to close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const modal = page.locator("[data-testid='add-client-modal']");
    const isVisible = await modal.isVisible().catch(() => false);
    console.log("Modal visible after Escape:", isVisible);
    console.log("Escape closes modal:", !isVisible);
  });
});
