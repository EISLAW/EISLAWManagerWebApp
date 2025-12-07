import { test, expect } from "@playwright/test";

test.describe("CTO Full Contacts Review - Inside Client Card Modal", () => {

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

  test("CM-01: Client card modal has contacts section", async ({ page }) => {
    await openClientCardModal(page);

    // Look for contacts section in modal
    const modal = page.locator("[data-testid='add-client-modal']");
    const modalVisible = await modal.isVisible();
    console.log("Modal visible:", modalVisible);

    // Get full modal HTML for analysis
    const modalHTML = await modal.innerHTML();
    console.log("Modal HTML length:", modalHTML.length);
    console.log("Contains אנשי קשר:", modalHTML.includes("אנשי קשר"));
    console.log("Contains contact:", modalHTML.toLowerCase().includes("contact"));

    await page.screenshot({ path: "tests/cm-01-modal.png", fullPage: true });

    expect(modalHTML).toContain("אנשי קשר");
    console.log("CM-01 PASS: Modal has contacts section");
  });

  test("CM-02: Contacts section has add button", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Find the contacts section
    const contactsSection = modal.locator("text=אנשי קשר").first();
    console.log("Contacts header found:", await contactsSection.count());

    // Look for add button near contacts (+ button, הוסף, etc.)
    const addBtns = modal.locator("button").filter({ hasText: /\+|הוסף|add/i });
    console.log("Add buttons in modal:", await addBtns.count());

    // Also check for SVG plus icons
    const svgBtns = modal.locator("button:has(svg)");
    console.log("Buttons with SVG icons:", await svgBtns.count());

    await page.screenshot({ path: "tests/cm-02-add-btn.png", fullPage: true });

    console.log("CM-02: Add button search complete");
  });

  test("CM-03: Show modal content structure", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Get all labels and inputs
    const labels = await modal.locator("label").allTextContents();
    console.log("Labels in modal:", labels.join(" | "));

    const inputs = await modal.locator("input, textarea, select").count();
    console.log("Input/textarea/select count:", inputs);

    // Get all headings/sections
    const headings = await modal.locator("h1, h2, h3, h4, h5, h6, .font-bold, .font-semibold").allTextContents();
    console.log("Headings/bold text:", headings.filter(h => h.trim()).join(" | "));

    // Get button texts
    const btnTexts = await modal.locator("button").allTextContents();
    console.log("Button texts:", btnTexts.filter(b => b.trim()).join(" | "));

    await page.screenshot({ path: "tests/cm-03-structure.png", fullPage: true });
  });

  test("CM-04: Fill contact form and submit", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Try to find contact-related inputs
    const nameInput = modal.locator("input").filter({ hasText: /שם|name/i });
    const emailInput = modal.locator("input[type='email'], input[placeholder*='email'], input[placeholder*='אימייל']");
    const phoneInput = modal.locator("input[type='tel'], input[placeholder*='phone'], input[placeholder*='טלפון']");
    const roleInput = modal.locator("input[placeholder*='תפקיד'], input[placeholder*='role']");

    console.log("Name inputs:", await nameInput.count());
    console.log("Email inputs:", await emailInput.count());
    console.log("Phone inputs:", await phoneInput.count());
    console.log("Role inputs:", await roleInput.count());

    // Get all input placeholders
    const placeholders = await modal.locator("input").evaluateAll(inputs =>
      inputs.map(i => ({
        placeholder: i.getAttribute("placeholder"),
        type: i.getAttribute("type"),
        name: i.getAttribute("name")
      }))
    );
    console.log("Input details:", JSON.stringify(placeholders));

    await page.screenshot({ path: "tests/cm-04-inputs.png", fullPage: true });
  });

  test("CM-05: Existing contacts display", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Look for contact cards/list items
    const contactItems = modal.locator("[class*='contact'], [data-testid*='contact']");
    console.log("Contact items:", await contactItems.count());

    // Check if there are any list items with emails/phones
    const listItems = modal.locator("li, [role='listitem']");
    console.log("List items in modal:", await listItems.count());

    // Look for typical contact patterns
    const emailLinks = modal.locator("a[href^='mailto:']");
    const phoneLinks = modal.locator("a[href^='tel:']");
    console.log("Email links:", await emailLinks.count());
    console.log("Phone links:", await phoneLinks.count());

    // Check for edit/delete buttons
    const editBtns = modal.locator("button").filter({ hasText: /עריכה|edit|✏/i });
    const deleteBtns = modal.locator("button").filter({ hasText: /מחיקה|delete|🗑|trash/i });
    console.log("Edit buttons:", await editBtns.count());
    console.log("Delete buttons:", await deleteBtns.count());

    await page.screenshot({ path: "tests/cm-05-contacts.png", fullPage: true });
  });

  test("CM-06: Primary contact indicator", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Look for star indicators
    const stars = modal.locator("text=★, text=⭐, [class*='star'], [class*='primary']");
    console.log("Star/primary indicators:", await stars.count());

    // Look for "ראשי" (primary) text
    const primaryText = modal.getByText(/ראשי|primary/i);
    console.log("Primary text:", await primaryText.count());

    await page.screenshot({ path: "tests/cm-06-primary.png", fullPage: true });
  });

  test("CM-07: Scroll to find contacts section", async ({ page }) => {
    await openClientCardModal(page);

    // The modal might be scrollable - scroll down to find contacts
    const modal = page.locator("[data-testid='add-client-modal']");

    // Try scrolling within the modal
    await modal.evaluate(el => el.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "tests/cm-07-scroll1.png", fullPage: true });

    await modal.evaluate(el => el.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "tests/cm-07-scroll2.png", fullPage: true });

    await modal.evaluate(el => el.scrollTo(0, 1500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "tests/cm-07-scroll3.png", fullPage: true });

    // After scrolling, check for contacts
    const contactsVisible = await modal.getByText("אנשי קשר").isVisible();
    console.log("Contacts section visible after scroll:", contactsVisible);
  });

  test("CM-08: Full modal content dump", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Get full text content
    const fullText = await modal.textContent();
    console.log("Full modal text (first 1000 chars):", fullText?.substring(0, 1000));
    console.log("Full modal text (1000-2000 chars):", fullText?.substring(1000, 2000));

    await page.screenshot({ path: "tests/cm-08-full.png", fullPage: true });
  });
});
