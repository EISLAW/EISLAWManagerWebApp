import { test, expect } from "@playwright/test";

test.describe("CTO Client Card - Fixed Tests & Deep Exploration", () => {

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

  test("FIX-01: Test Status SELECT dropdown", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Find the select element
    const statusSelect = modal.locator("select");
    console.log("Select elements found:", await statusSelect.count());

    if (await statusSelect.count() > 0) {
      // Get current value
      const currentValue = await statusSelect.inputValue();
      console.log("Current status value:", currentValue);

      // Get all options
      const options = await statusSelect.locator("option").allTextContents();
      console.log("Status options:", options.join(" | "));

      // Try changing the status
      await statusSelect.selectOption("בתהליך");
      await page.waitForTimeout(500);
      const newValue = await statusSelect.inputValue();
      console.log("After selecting 'בתהליך':", newValue);

      // Check if save button enables
      const saveBtn = modal.locator("[data-testid='client-modal-submit']");
      console.log("Save button disabled:", await saveBtn.isDisabled());

      await page.screenshot({ path: "tests/fix-01-status-dropdown.png", fullPage: true });
    }
  });

  test("FIX-02: Test Notes textarea specifically", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // There are 2 textareas - email (has placeholder) and notes (no placeholder)
    // Notes is the one without placeholder
    const notesTextarea = modal.locator("textarea").nth(1); // Second textarea

    const originalValue = await notesTextarea.inputValue();
    console.log("Original notes:", originalValue || "(empty)");

    // Add notes
    await notesTextarea.fill("Test notes from CTO review - " + Date.now());
    const newValue = await notesTextarea.inputValue();
    console.log("New notes:", newValue);

    // Check save button
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");
    console.log("Save button disabled after notes change:", await saveBtn.isDisabled());

    await page.screenshot({ path: "tests/fix-02-notes.png", fullPage: true });
  });

  test("FIX-03: Test Email textarea (multiple emails)", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Email is the first textarea (has placeholder)
    const emailTextarea = modal.locator("textarea[placeholder*='email']");
    console.log("Email textarea found:", await emailTextarea.count());

    if (await emailTextarea.count() > 0) {
      const originalValue = await emailTextarea.inputValue();
      console.log("Original emails:", originalValue || "(empty)");

      // Add multiple emails
      await emailTextarea.fill("test1@example.com, test2@example.com");
      const newValue = await emailTextarea.inputValue();
      console.log("New emails:", newValue);

      await page.screenshot({ path: "tests/fix-03-emails.png", fullPage: true });
    }
  });

  test("FIX-04: Check what enables Save button", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");

    console.log("Initial save button disabled:", await saveBtn.isDisabled());

    // Try each field and check if save enables

    // 1. Name change
    const nameInput = modal.locator("input").first();
    const originalName = await nameInput.inputValue();
    await nameInput.fill(originalName + "X");
    console.log("After name change, disabled:", await saveBtn.isDisabled());
    await nameInput.fill(originalName); // restore

    // 2. Phone change
    const phoneInput = modal.locator("input[type='tel']");
    await phoneInput.fill("050-1111111");
    console.log("After phone change, disabled:", await saveBtn.isDisabled());
    await phoneInput.clear();

    // 3. Status change
    const statusSelect = modal.locator("select");
    const originalStatus = await statusSelect.inputValue();
    await statusSelect.selectOption("הושלם");
    console.log("After status change, disabled:", await saveBtn.isDisabled());
    if (originalStatus) await statusSelect.selectOption(originalStatus);

    // 4. Notes change
    const notesTextarea = modal.locator("textarea").nth(1);
    await notesTextarea.fill("Test note");
    console.log("After notes change, disabled:", await saveBtn.isDisabled());
    await notesTextarea.clear();

    // 5. Client type change
    const typeBtn = modal.getByRole("button", { name: "ריטיינר" });
    await typeBtn.click();
    await page.waitForTimeout(300);
    console.log("After type change, disabled:", await saveBtn.isDisabled());

    await page.screenshot({ path: "tests/fix-04-save-enable.png", fullPage: true });
  });

  test("FIX-05: Verify Airtable status display", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Find Airtable section
    const airtableLabel = modal.getByText("מזהה Airtable");
    console.log("Airtable label found:", await airtableLabel.count());

    // Get the whole Airtable section
    const airtableSection = modal.locator("text=מזהה Airtable").locator("xpath=../..");
    const sectionText = await airtableSection.textContent();
    console.log("Airtable section text:", sectionText);

    // Check for linked/not linked indicators
    const hasLinked = sectionText?.includes("מקושר");
    const hasNotLinked = sectionText?.includes("לא מקושר");
    console.log("Contains 'מקושר':", hasLinked);
    console.log("Contains 'לא מקושר':", hasNotLinked);

    await page.screenshot({ path: "tests/fix-05-airtable.png", fullPage: true });
  });

  test("FIX-06: Test folder browse button behavior", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Monitor for any popups or dialogs
    page.on("dialog", async dialog => {
      console.log("Dialog appeared:", dialog.type(), dialog.message());
      await dialog.dismiss();
    });

    const popupPromise = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);

    const browseBtn = modal.getByRole("button", { name: "עיין" });
    await browseBtn.click();

    const popup = await popupPromise;
    if (popup) {
      console.log("Popup opened:", popup.url());
    } else {
      console.log("No popup opened");
    }

    await page.waitForTimeout(2000);

    // Check if any new modal/dialog appeared
    const dialogs = page.locator("[role='dialog']");
    console.log("Dialogs on page:", await dialogs.count());

    // Check for SharePoint folder picker
    const spContent = page.getByText(/SharePoint|תיקייה|folder/i);
    console.log("SharePoint/folder text found:", await spContent.count());

    await page.screenshot({ path: "tests/fix-06-folder.png", fullPage: true });
  });

  test("FIX-07: Complete CRUD test - Create, Read, Update", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Save original values
    const nameInput = modal.locator("input").first();
    const originalName = await nameInput.inputValue();
    console.log("Original name:", originalName);

    // Make changes
    const phoneInput = modal.locator("input[type='tel']");
    await phoneInput.fill("050-7777777");

    const notesTextarea = modal.locator("textarea").nth(1);
    await notesTextarea.fill("CRUD test note - " + Date.now());

    // Type button click
    await modal.getByRole("button", { name: "ריטיינר" }).click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: "tests/fix-07-before-save.png", fullPage: true });

    // Check save button
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");
    const isDisabled = await saveBtn.isDisabled();
    console.log("Save button disabled before save:", isDisabled);

    if (!isDisabled) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log("Clicked save");

      // Verify modal closed or shows success
      const modalStillOpen = await modal.isVisible().catch(() => false);
      console.log("Modal still open after save:", modalStillOpen);

      if (!modalStillOpen) {
        // Reopen and verify changes persisted
        await page.locator("[data-testid='open-client-card']").click();
        await page.waitForTimeout(2000);

        const newPhone = await modal.locator("input[type='tel']").inputValue();
        console.log("Phone after reopen:", newPhone);
        console.log("Phone persisted:", newPhone === "050-7777777");
      }

      await page.screenshot({ path: "tests/fix-07-after-save.png", fullPage: true });
    }
  });

  test("FIX-08: Check for redundant/duplicate elements", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Count all interactive elements
    const buttonCount = await modal.locator("button").count();
    const inputCount = await modal.locator("input").count();
    const textareaCount = await modal.locator("textarea").count();
    const selectCount = await modal.locator("select").count();
    const linkCount = await modal.locator("a").count();

    console.log("=== Element Counts ===");
    console.log("Buttons:", buttonCount);
    console.log("Inputs:", inputCount);
    console.log("Textareas:", textareaCount);
    console.log("Selects:", selectCount);
    console.log("Links:", linkCount);

    // Check for duplicate buttons (same text)
    const buttonTexts = await modal.locator("button").allTextContents();
    const uniqueButtons = new Set(buttonTexts.map(t => t.trim()).filter(Boolean));
    console.log("=== Unique button texts ===");
    console.log([...uniqueButtons].join(" | "));

    if (buttonTexts.length !== uniqueButtons.size) {
      console.log("WARNING: Duplicate button texts detected!");
      const counts: Record<string, number> = {};
      buttonTexts.forEach(t => {
        const clean = t.trim();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
      Object.entries(counts).filter(([_, c]) => c > 1).forEach(([t, c]) => {
        console.log(`  DUPLICATE: '${t}' appears ${c} times`);
      });
    }

    // Check for orphan/hidden elements
    const allButtons = await modal.locator("button").all();
    let hiddenButtons = 0;
    for (const btn of allButtons) {
      if (!(await btn.isVisible())) hiddenButtons++;
    }
    console.log("Hidden buttons:", hiddenButtons);

    await page.screenshot({ path: "tests/fix-08-redundant.png", fullPage: true });
  });

  test("FIX-09: Test all Client Type buttons work as radio/toggle", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const types = ["בטיפול", "ריטיינר", "ליטיגציה", "טיפול הושלם", "פוטנציאלי"];

    for (const type of types) {
      const btn = modal.getByRole("button", { name: type });
      await btn.click();
      await page.waitForTimeout(300);

      // Check if this button now has "selected" styling
      const className = await btn.getAttribute("class");
      const isSelected = className?.includes("bg-petrol") || className?.includes("bg-slate-800") || className?.includes("text-white");
      console.log(`${type}: selected=${isSelected}`);
    }

    await page.screenshot({ path: "tests/fix-09-type-toggle.png", fullPage: true });
  });

  test("FIX-10: Final full form submission test", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Get all current values
    const nameValue = await modal.locator("input").first().inputValue();
    const phoneValue = await modal.locator("input[type='tel']").inputValue();
    const statusValue = await modal.locator("select").inputValue();
    const notesValue = await modal.locator("textarea").nth(1).inputValue();

    console.log("=== Current Values ===");
    console.log("Name:", nameValue);
    console.log("Phone:", phoneValue);
    console.log("Status:", statusValue);
    console.log("Notes:", notesValue?.substring(0, 50));

    // Make a small change to enable save
    const notesTextarea = modal.locator("textarea").nth(1);
    await notesTextarea.fill((notesValue || "") + " [CTO Test]");

    // Verify save button state
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");
    console.log("Save enabled:", !(await saveBtn.isDisabled()));

    await page.screenshot({ path: "tests/fix-10-final.png", fullPage: true });
  });
});
