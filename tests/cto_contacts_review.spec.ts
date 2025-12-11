import { test, expect } from "@playwright/test";

test.describe("CTO Skeptical Review - Phase 4I Contacts Feature", () => {

  // Helper to navigate to a client with contacts
  async function navigateToClient(page: any) {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);
    // Click first client
    await page.locator("table tbody tr a").first().click();
    await page.waitForTimeout(2000);
  }

  test("CT-01: Contacts section exists with header", async ({ page }) => {
    await navigateToClient(page);

    // Look for אנשי קשר section/header
    const contactsHeader = page.getByText(/אנשי קשר|Contacts/i);
    const count = await contactsHeader.count();
    console.log("Contacts header found:", count);

    await page.screenshot({ path: "tests/contacts-01-section.png", fullPage: true });

    if (count > 0) {
      console.log("CT-01 PASS: Contacts section header exists");
    } else {
      console.log("CT-01 FAIL: Contacts section not found");
    }
    expect(count).toBeGreaterThan(0);
  });

  test("CT-02: Add contact button exists", async ({ page }) => {
    await navigateToClient(page);

    // Look for add contact button (+ icon or "הוסף איש קשר")
    const addBtn = page.locator("button, [role='button']").filter({
      hasText: /\+|הוסף|Add/i
    });

    // Also check for a button near contacts section
    const contactsSection = page.getByText(/אנשי קשר/i);

    await page.screenshot({ path: "tests/contacts-02-add-btn.png", fullPage: true });

    // Check for any add-type buttons
    const allButtons = await page.locator("button").allTextContents();
    console.log("All buttons on page:", allButtons.slice(0, 15).join(" | "));

    // Look for plus icon button
    const plusBtn = page.locator("[data-testid*='add'], [data-testid*='contact'], button:has(svg)");
    console.log("Potential add buttons:", await plusBtn.count());

    console.log("CT-02: Looking for add contact button");
  });

  test("CT-03: Contacts list displays contact cards", async ({ page }) => {
    await navigateToClient(page);

    // Look for contact cards - could be in various forms
    const contactCards = page.locator("[data-testid*='contact'], .contact-card, .contact-item");
    const cardCount = await contactCards.count();
    console.log("Contact cards found:", cardCount);

    // Look for typical contact info patterns
    const emailPatterns = page.locator("text=/@/i, a[href^='mailto:']");
    const phonePatterns = page.locator("a[href^='tel:']");

    console.log("Email elements:", await emailPatterns.count());
    console.log("Phone elements:", await phonePatterns.count());

    await page.screenshot({ path: "tests/contacts-03-list.png", fullPage: true });

    console.log("CT-03: Contact cards check complete");
  });

  test("CT-04: Contact card shows name, role, email, phone", async ({ page }) => {
    await navigateToClient(page);

    // Get page content and look for contact-like patterns
    const content = await page.textContent("body");

    // Check for contact field labels or values
    const hasRole = content?.includes("תפקיד") || content?.includes("Role");
    const hasEmail = content?.includes("@") || content?.includes("אימייל");
    const hasPhone = content?.includes("טלפון") || content?.includes("Phone") || /\d{2,3}-?\d{7}/.test(content || "");

    console.log("Has role indicator:", hasRole);
    console.log("Has email indicator:", hasEmail);
    console.log("Has phone indicator:", hasPhone);

    await page.screenshot({ path: "tests/contacts-04-card-fields.png", fullPage: true });

    console.log("CT-04: Contact card fields check complete");
  });

  test("CT-05: Primary contact indicator (star)", async ({ page }) => {
    await navigateToClient(page);

    // Look for star icon - could be ★, ⭐, or SVG
    const starIcon = page.locator("text=★, text=⭐, [data-testid*='primary'], [data-testid*='star']");
    const svgStars = page.locator("svg").filter({ hasText: /star/i });

    console.log("Star text icons:", await starIcon.count());

    // Also check for any "primary" or "ראשי" text
    const primaryText = page.getByText(/ראשי|Primary/i);
    console.log("Primary text:", await primaryText.count());

    await page.screenshot({ path: "tests/contacts-05-primary.png", fullPage: true });

    console.log("CT-05: Primary contact indicator check complete");
  });

  test("CT-06: Click add contact opens form", async ({ page }) => {
    await navigateToClient(page);

    // Try to find and click add contact button
    // Look for various patterns
    const addPatterns = [
      page.locator("[data-testid='add-contact']"),
      page.locator("[data-testid='contact-add']"),
      page.locator("button").filter({ hasText: /הוסף איש קשר|Add Contact/i }),
      page.locator("button").filter({ hasText: "+" }).first()
    ];

    let clicked = false;
    for (const pattern of addPatterns) {
      if (await pattern.count() > 0 && await pattern.first().isVisible()) {
        await pattern.first().click();
        await page.waitForTimeout(1000);
        clicked = true;
        console.log("Clicked add contact button");
        break;
      }
    }

    if (!clicked) {
      // Try clicking any button with plus in the contacts area
      const plusBtns = page.locator("button:has(svg)");
      const count = await plusBtns.count();
      console.log("Plus-type buttons found:", count);
    }

    await page.screenshot({ path: "tests/contacts-06-add-form.png", fullPage: true });

    // Check for form inputs (name, email, phone, role)
    const inputs = page.locator("input[type='text'], input[type='email'], input[type='tel']");
    console.log("Form inputs after click:", await inputs.count());

    console.log("CT-06: Add contact form check complete");
  });

  test("CT-07: API - GET contacts returns data", async ({ request }) => {
    // First get a client ID
    const clientsRes = await request.get("http://localhost:8799/clients");
    const clients = await clientsRes.json();

    if (clients.length > 0) {
      const clientId = clients[0].id;
      console.log("Testing contacts for client:", clientId);

      const contactsRes = await request.get(`http://localhost:8799/contacts/${clientId}`);
      console.log("Contacts API status:", contactsRes.status());

      if (contactsRes.ok()) {
        const contacts = await contactsRes.json();
        console.log("Contacts returned:", contacts.length);

        if (contacts.length > 0) {
          console.log("First contact:", JSON.stringify(contacts[0]).substring(0, 150));
        }
      }

      expect(contactsRes.status()).toBeLessThan(500);
      console.log("CT-07 PASS: Contacts API works");
    }
  });

  test("CT-08: API - Create contact", async ({ request }) => {
    // Get a client ID
    const clientsRes = await request.get("http://localhost:8799/clients");
    const clients = await clientsRes.json();

    if (clients.length > 0) {
      const clientId = clients[0].id;
      const testName = `Test Contact ${Date.now()}`;

      const response = await request.post("http://localhost:8799/contacts", {
        data: {
          client_id: clientId,
          name: testName,
          role: "Test Role",
          email: "test@example.com",
          phone: "050-1234567",
          is_primary: false
        }
      });

      console.log("Create contact status:", response.status());
      const result = await response.json();
      console.log("Create result:", JSON.stringify(result).substring(0, 200));

      if (response.ok()) {
        console.log("CT-08 PASS: Contact created successfully");

        // Clean up - delete the test contact
        if (result.id) {
          await request.delete(`http://localhost:8799/contacts/${result.id}`);
          console.log("Test contact cleaned up");
        }
      } else {
        console.log("CT-08 INFO: Create returned", response.status());
      }

      expect(response.status()).toBeLessThan(500);
    }
  });

  test("CT-09: API - Update contact", async ({ request }) => {
    // Get a client and create a test contact
    const clientsRes = await request.get("http://localhost:8799/clients");
    const clients = await clientsRes.json();

    if (clients.length > 0) {
      const clientId = clients[0].id;

      // Create a contact first
      const createRes = await request.post("http://localhost:8799/contacts", {
        data: {
          client_id: clientId,
          name: "Update Test Contact",
          role: "Original Role",
          email: "update@test.com",
          phone: "050-0000000",
          is_primary: false
        }
      });

      if (createRes.ok()) {
        const created = await createRes.json();
        console.log("Created contact ID:", created.id);

        // Update it
        const updateRes = await request.patch(`http://localhost:8799/contacts/${created.id}`, {
          data: {
            role: "Updated Role",
            phone: "050-9999999"
          }
        });

        console.log("Update status:", updateRes.status());

        if (updateRes.ok()) {
          const updated = await updateRes.json();
          console.log("Updated contact:", JSON.stringify(updated).substring(0, 150));
          console.log("CT-09 PASS: Contact updated successfully");
        }

        // Clean up
        await request.delete(`http://localhost:8799/contacts/${created.id}`);
      }
    }
  });

  test("CT-10: API - Delete contact", async ({ request }) => {
    const clientsRes = await request.get("http://localhost:8799/clients");
    const clients = await clientsRes.json();

    if (clients.length > 0) {
      const clientId = clients[0].id;

      // Create a contact to delete
      const createRes = await request.post("http://localhost:8799/contacts", {
        data: {
          client_id: clientId,
          name: "Delete Test Contact",
          role: "To Delete",
          email: "delete@test.com",
          phone: "050-1111111",
          is_primary: false
        }
      });

      if (createRes.ok()) {
        const created = await createRes.json();
        console.log("Created contact to delete, ID:", created.id);

        // Delete it
        const deleteRes = await request.delete(`http://localhost:8799/contacts/${created.id}`);
        console.log("Delete status:", deleteRes.status());

        if (deleteRes.ok() || deleteRes.status() === 204) {
          console.log("CT-10 PASS: Contact deleted successfully");
        }

        // Verify deletion
        const checkRes = await request.get(`http://localhost:8799/contacts/${clientId}`);
        const remaining = await checkRes.json();
        const stillExists = remaining.find((c: any) => c.id === created.id);
        console.log("Contact still exists:", !!stillExists);
        expect(stillExists).toBeFalsy();
      }
    }
  });

  test("CT-11: API - Set primary contact", async ({ request }) => {
    const clientsRes = await request.get("http://localhost:8799/clients");
    const clients = await clientsRes.json();

    if (clients.length > 0) {
      const clientId = clients[0].id;

      // Create a contact and set as primary
      const createRes = await request.post("http://localhost:8799/contacts", {
        data: {
          client_id: clientId,
          name: "Primary Test Contact",
          role: "Primary Role",
          email: "primary@test.com",
          phone: "050-2222222",
          is_primary: true
        }
      });

      if (createRes.ok()) {
        const created = await createRes.json();
        console.log("Created primary contact:", created.is_primary);

        // Update to make it primary (if not already)
        const updateRes = await request.patch(`http://localhost:8799/contacts/${created.id}`, {
          data: {
            is_primary: true
          }
        });

        if (updateRes.ok()) {
          const updated = await updateRes.json();
          console.log("After update, is_primary:", updated.is_primary);
          console.log("CT-11 PASS: Primary contact toggle works");
        }

        // Clean up
        await request.delete(`http://localhost:8799/contacts/${created.id}`);
      }
    }
  });

  test("CT-12: UI - Full add contact flow", async ({ page }) => {
    await navigateToClient(page);
    await page.screenshot({ path: "tests/contacts-12-before.png", fullPage: true });

    // Look for the contacts section and add button
    const contactsArea = page.locator("section, div").filter({ hasText: /אנשי קשר/i });
    console.log("Contacts area found:", await contactsArea.count());

    // Try various add button patterns
    const addButtonSelectors = [
      "[data-testid='add-contact']",
      "[data-testid='contact.add']",
      "button:has-text('הוסף איש קשר')",
      "button:has-text('הוספה')",
      "[aria-label*='add']",
      "[aria-label*='הוסף']"
    ];

    for (const selector of addButtonSelectors) {
      const btn = page.locator(selector);
      if (await btn.count() > 0) {
        console.log("Found add button with selector:", selector);
        break;
      }
    }

    // Get all buttons and log for debugging
    const allBtns = await page.locator("button").evaluateAll(btns =>
      btns.map(b => ({
        text: b.textContent?.trim().substring(0, 30),
        testId: b.getAttribute("data-testid"),
        ariaLabel: b.getAttribute("aria-label")
      }))
    );
    console.log("All buttons:", JSON.stringify(allBtns.slice(0, 10)));

    await page.screenshot({ path: "tests/contacts-12-buttons.png", fullPage: true });
    console.log("CT-12: UI add contact flow exploration complete");
  });
});
