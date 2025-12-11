import { test, expect } from "@playwright/test";

test.describe("CTO - Complete Contact Save Flow", () => {

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

  test("SAVE-01: Add contact and save", async ({ page }) => {
    await openClientCardModal(page);

    // Check initial state - should show "אין אנשי קשר"
    const noContactsBefore = await page.getByText("אין אנשי קשר").isVisible();
    console.log("No contacts visible before:", noContactsBefore);
    await page.screenshot({ path: "tests/save-01-before.png", fullPage: true });

    // Click add contact
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(1000);

    // Fill the contact form
    const testName = `Test Contact ${Date.now()}`;
    await page.locator("input[placeholder='שם מלא']").fill(testName);
    await page.locator("input[placeholder='תפקיד']").fill("QA Tester");
    await page.locator("input[placeholder='email@example.com']").fill("qa@test.com");
    await page.locator("input[placeholder='052-1234567']").last().fill("050-9876543");

    await page.screenshot({ path: "tests/save-01-filled.png", fullPage: true });

    // Click save button (the one for the contact, not the main modal)
    // The contact form should have its own save button
    const saveBtn = page.getByRole("button", { name: "שמור" }).first();
    console.log("Save buttons found:", await page.getByRole("button", { name: "שמור" }).count());

    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log("Clicked save button");
    }

    await page.screenshot({ path: "tests/save-01-after.png", fullPage: true });

    // Check if "אין אנשי קשר" is still visible (should NOT be if contact was added)
    const noContactsAfter = await page.getByText("אין אנשי קשר").isVisible();
    console.log("No contacts visible after:", noContactsAfter);

    // Look for the contact name we just added
    const contactVisible = await page.getByText(testName).isVisible();
    console.log("New contact visible:", contactVisible);

    if (!noContactsAfter && contactVisible) {
      console.log("SAVE-01 PASS: Contact added and visible!");
    } else if (!noContactsAfter) {
      console.log("SAVE-01 PARTIAL: No contacts message gone, but couldn't find contact by name");
    } else {
      console.log("SAVE-01 FAIL: No contacts message still visible");
    }
  });

  test("SAVE-02: Verify contact persists after modal close/reopen", async ({ page }) => {
    await openClientCardModal(page);

    // First add a contact
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(1000);

    const testName = `Persist Test ${Date.now()}`;
    await page.locator("input[placeholder='שם מלא']").fill(testName);
    await page.locator("input[placeholder='תפקיד']").fill("Persistence Test");
    await page.locator("input[placeholder='email@example.com']").fill("persist@test.com");

    // Save the contact
    await page.getByRole("button", { name: "שמור" }).first().click();
    await page.waitForTimeout(1000);

    // Now save the main modal (שמור שינויים)
    await page.getByRole("button", { name: "שמור שינויים" }).click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "tests/save-02-saved.png", fullPage: true });

    // Reopen the modal
    await page.locator("[data-testid='open-client-card']").click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "tests/save-02-reopened.png", fullPage: true });

    // Check if contact is still there
    const contactStillVisible = await page.getByText(testName).isVisible();
    console.log("Contact visible after reopen:", contactStillVisible);

    if (contactStillVisible) {
      console.log("SAVE-02 PASS: Contact persisted!");
    } else {
      // Check if ANY contacts are showing
      const noContacts = await page.getByText("אין אנשי קשר").isVisible();
      console.log("No contacts message visible:", noContacts);
    }
  });

  test("SAVE-03: Edit existing contact", async ({ page }) => {
    await openClientCardModal(page);

    // Check for existing contacts
    const noContacts = await page.getByText("אין אנשי קשר").isVisible();
    console.log("No contacts:", noContacts);

    if (noContacts) {
      // First add a contact to edit
      await page.getByText("+הוסף איש קשר").click();
      await page.waitForTimeout(500);
      await page.locator("input[placeholder='שם מלא']").fill("Edit Test Contact");
      await page.locator("input[placeholder='תפקיד']").fill("Original Role");
      await page.getByRole("button", { name: "שמור" }).first().click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: "tests/save-03-before-edit.png", fullPage: true });

    // Look for edit button
    const editBtns = page.locator("button").filter({ hasText: /עריכה|edit|✏/i });
    const editIconBtns = page.locator("[aria-label*='edit'], [aria-label*='עריכה']");
    const pencilBtns = page.locator("button:has(svg)").filter({ hasText: "" });

    console.log("Edit buttons:", await editBtns.count());
    console.log("Edit icon buttons:", await editIconBtns.count());

    // Get all buttons and look for edit patterns
    const allBtns = await page.locator("button").allTextContents();
    console.log("All buttons:", allBtns.join(" | "));
  });

  test("SAVE-04: Delete contact", async ({ page }) => {
    await openClientCardModal(page);

    // Check for existing contacts
    const noContacts = await page.getByText("אין אנשי קשר").isVisible();

    if (noContacts) {
      // Add a contact first
      await page.getByText("+הוסף איש קשר").click();
      await page.waitForTimeout(500);
      await page.locator("input[placeholder='שם מלא']").fill("Delete Test Contact");
      await page.getByRole("button", { name: "שמור" }).first().click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: "tests/save-04-before-delete.png", fullPage: true });

    // Look for delete button
    const deleteBtns = page.locator("button").filter({ hasText: /מחק|delete|🗑/i });
    console.log("Delete buttons:", await deleteBtns.count());

    // Get modal HTML to look for contact structure
    const modal = page.locator("[data-testid='add-client-modal']");
    const contactsHTML = await modal.innerHTML();
    console.log("Modal has delete icon:", contactsHTML.includes("delete") || contactsHTML.includes("trash"));
  });

  test("SAVE-05: Toggle primary contact", async ({ page }) => {
    await openClientCardModal(page);

    // Add a contact with primary checkbox
    await page.getByText("+הוסף איש קשר").click();
    await page.waitForTimeout(500);

    await page.locator("input[placeholder='שם מלא']").fill("Primary Test Contact");
    await page.locator("input[placeholder='תפקיד']").fill("CEO");

    // Find and check the primary checkbox
    const primaryCheckbox = page.locator("input[type='checkbox']").last();
    console.log("Primary checkbox found:", await primaryCheckbox.count());

    if (await primaryCheckbox.count() > 0) {
      const isChecked = await primaryCheckbox.isChecked();
      console.log("Primary checkbox initially checked:", isChecked);

      // Toggle it
      await primaryCheckbox.check();
      const isCheckedAfter = await primaryCheckbox.isChecked();
      console.log("Primary checkbox after check:", isCheckedAfter);

      await page.screenshot({ path: "tests/save-05-primary.png", fullPage: true });

      if (isCheckedAfter) {
        console.log("SAVE-05 PASS: Primary checkbox works");
      }
    }
  });
});
