import { test, expect } from "@playwright/test";

test.describe("CTO - INVESTIGATE SAVE BUTTON BUG", () => {

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

  test("BUG-01: Check save button class changes", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");

    // Get initial button state
    const initialClass = await saveBtn.getAttribute("class");
    const initialDisabled = await saveBtn.isDisabled();
    console.log("Initial class:", initialClass);
    console.log("Initial disabled:", initialDisabled);

    // Make a change
    const phoneInput = modal.locator("input[type='tel']");
    await phoneInput.fill("050-1234567");
    await page.waitForTimeout(1000);

    // Check button state after change
    const afterClass = await saveBtn.getAttribute("class");
    const afterDisabled = await saveBtn.isDisabled();
    console.log("After change class:", afterClass);
    console.log("After change disabled:", afterDisabled);

    // Check for required fields validation
    const nameInput = modal.locator("input").first();
    const nameValue = await nameInput.inputValue();
    console.log("Name value (required):", nameValue);

    // Check email (also required based on label *)
    const emailTextarea = modal.locator("textarea").first();
    const emailValue = await emailTextarea.inputValue();
    console.log("Email value (required):", emailValue || "(empty)");

    await page.screenshot({ path: "tests/bug-01-save-state.png", fullPage: true });
  });

  test("BUG-02: Try filling ALL required fields", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");

    console.log("Initial disabled:", await saveBtn.isDisabled());

    // Fill all potentially required fields
    // Name is already filled

    // Email (marked with *)
    const emailTextarea = modal.locator("textarea").first();
    await emailTextarea.fill("test@example.com");
    console.log("After email, disabled:", await saveBtn.isDisabled());

    // Phone
    const phoneInput = modal.locator("input[type='tel']");
    await phoneInput.fill("050-1234567");
    console.log("After phone, disabled:", await saveBtn.isDisabled());

    // Status
    const statusSelect = modal.locator("select");
    await statusSelect.selectOption("בתהליך");
    console.log("After status, disabled:", await saveBtn.isDisabled());

    // Type
    await modal.getByRole("button", { name: "בטיפול" }).click();
    await page.waitForTimeout(300);
    console.log("After type, disabled:", await saveBtn.isDisabled());

    await page.screenshot({ path: "tests/bug-02-all-fields.png", fullPage: true });
  });

  test("BUG-03: Check form validation messages", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Look for validation messages or error states
    const errorMessages = modal.locator(".text-red, .text-error, [class*='error'], [class*='invalid']");
    console.log("Error elements:", await errorMessages.count());

    // Check for aria-invalid attributes
    const invalidInputs = modal.locator("[aria-invalid='true']");
    console.log("Invalid inputs:", await invalidInputs.count());

    // Check for required attribute
    const requiredInputs = modal.locator("[required]");
    console.log("Required inputs:", await requiredInputs.count());

    // Get all form field states
    const allInputs = await modal.locator("input, textarea, select").evaluateAll(els =>
      els.map(e => ({
        tag: e.tagName,
        value: (e as HTMLInputElement).value?.substring(0, 20),
        required: e.hasAttribute("required"),
        invalid: e.getAttribute("aria-invalid"),
        classes: e.className.substring(0, 50)
      }))
    );
    console.log("All field states:", JSON.stringify(allInputs, null, 2));

    await page.screenshot({ path: "tests/bug-03-validation.png", fullPage: true });
  });

  test("BUG-04: Check if this is an edit vs create modal", async ({ page }) => {
    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Check modal title
    const modalTitle = modal.locator("h1, h2, h3, [class*='title'], [class*='header']").first();
    const titleText = await modalTitle.textContent();
    console.log("Modal title:", titleText);

    // Is this "עריכת לקוח" (Edit client) or "הוספת לקוח" (Add client)?
    const isEdit = titleText?.includes("עריכה") || titleText?.includes("Edit");
    console.log("Is edit mode:", isEdit);

    // Check if there's a dirty state tracking
    const formElement = modal.locator("form");
    console.log("Form elements:", await formElement.count());

    await page.screenshot({ path: "tests/bug-04-modal-type.png", fullPage: true });
  });

  test("BUG-05: Try different client to see if issue is specific", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);

    // Try second client
    const clientRows = page.locator("table tbody tr a");
    const clientCount = await clientRows.count();
    console.log("Total clients:", clientCount);

    if (clientCount > 1) {
      await clientRows.nth(1).click(); // Second client
      await page.waitForTimeout(2000);

      await page.locator("[data-testid='open-client-card']").click();
      await page.waitForTimeout(2000);

      const modal = page.locator("[data-testid='add-client-modal']");
      const saveBtn = modal.locator("[data-testid='client-modal-submit']");

      // Get initial state
      const name = await modal.locator("input").first().inputValue();
      console.log("Second client name:", name);
      console.log("Save disabled initially:", await saveBtn.isDisabled());

      // Make a change
      await modal.locator("input[type='tel']").fill("050-5555555");
      console.log("Save disabled after change:", await saveBtn.isDisabled());

      await page.screenshot({ path: "tests/bug-05-second-client.png", fullPage: true });
    }
  });

  test("BUG-06: Check JavaScript console for errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];

    page.on("console", msg => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(msg.text().substring(0, 100));
      }
    });

    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Make changes and watch for errors
    await modal.locator("input[type='tel']").fill("050-6666666");
    await page.waitForTimeout(1000);

    console.log("Console errors:", consoleErrors.length);
    consoleErrors.forEach(e => console.log("  ERROR:", e.substring(0, 150)));

    console.log("Console logs:", consoleLogs.length);
    consoleLogs.slice(-10).forEach(l => console.log("  LOG:", l));

    await page.screenshot({ path: "tests/bug-06-console.png", fullPage: true });
  });

  test("BUG-07: Network requests when changing fields", async ({ page }) => {
    const requests: string[] = [];

    page.on("request", req => {
      if (req.method() !== "GET" || req.url().includes("/api/")) {
        requests.push(`${req.method()} ${req.url().substring(0, 80)}`);
      }
    });

    await openClientCardModal(page);

    const modal = page.locator("[data-testid='add-client-modal']");

    // Make changes
    await modal.locator("input[type='tel']").fill("050-7777777");
    await page.waitForTimeout(500);

    await modal.getByRole("button", { name: "ריטיינר" }).click();
    await page.waitForTimeout(500);

    console.log("Network requests during editing:");
    requests.forEach(r => console.log("  ", r));

    // Check save button
    const saveBtn = modal.locator("[data-testid='client-modal-submit']");
    console.log("Save still disabled:", await saveBtn.isDisabled());

    await page.screenshot({ path: "tests/bug-07-network.png", fullPage: true });
  });

  test("BUG-08: Compare with fresh client", async ({ page, request }) => {
    // Check API to see if client exists
    const clientsRes = await request.get("http://localhost:8799/clients");
    const clients = await clientsRes.json();

    console.log("Total clients in API:", clients.length);

    if (clients.length > 0) {
      const firstClient = clients[0];
      console.log("First client data:", JSON.stringify(firstClient).substring(0, 300));

      // Check what fields are actually filled
      const filledFields = Object.entries(firstClient)
        .filter(([k, v]) => v !== null && v !== "" && v !== undefined)
        .map(([k]) => k);
      console.log("Filled fields:", filledFields.join(", "));
    }
  });
});
