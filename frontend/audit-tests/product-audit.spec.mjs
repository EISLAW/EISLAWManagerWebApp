import { test, expect } from "@playwright/test";

const BASE_URL = "http://20.217.86.4:5173";
const API_URL = "http://20.217.86.4:8799";

test.describe("Product Audit - David", () => {

  // ============================================
  // USER JOURNEY: Legal Secretary (רונית)
  // ============================================
  test.describe("Journey: Legal Secretary", () => {

    test("J1: Find client by name", async ({ page }) => {
      console.log("=== Journey: Find Client ===");

      await page.goto(BASE_URL + "/#/clients");
      await page.waitForLoadState("networkidle");
      console.log("✓ Clients page loaded");

      // Check if search input exists
      const searchInput = page.locator("input").first();
      const searchExists = await searchInput.isVisible();
      console.log("Search input exists:", searchExists);

      if (searchExists) {
        await searchInput.fill("סיון");
        await page.waitForTimeout(500);
        console.log("✓ Typed search term");
      }

      await page.screenshot({ path: "audit-screenshots/journey-find-client.png" });

      // Check for table rows
      const rows = page.locator("table tbody tr");
      const rowCount = await rows.count();
      console.log("Client rows visible:", rowCount);
    });

    test("J2: Check client emails", async ({ page }) => {
      console.log("=== Journey: Check Emails ===");

      await page.goto(BASE_URL + "/#/clients");
      await page.waitForLoadState("networkidle");

      const firstRow = page.locator("table tbody tr").first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForLoadState("networkidle");
        console.log("✓ Clicked on client row");
      }

      await page.waitForTimeout(1000);
      await page.screenshot({ path: "audit-screenshots/journey-client-detail.png", fullPage: true });

      // Look for emails tab
      const allButtons = await page.locator("button, [role=tab], a").allTextContents();
      console.log("Available tabs/buttons:", allButtons.filter(t => t.trim()));

      const emailsTab = page.locator("text=אימיילים, text=Emails, [data-testid*=email]").first();
      if (await emailsTab.isVisible()) {
        await emailsTab.click();
        await page.waitForTimeout(1000);
        console.log("✓ Clicked emails tab");
        await page.screenshot({ path: "audit-screenshots/journey-emails-tab.png", fullPage: true });
      } else {
        console.log("✗ Emails tab not found");
      }
    });

    test("J3: Create a task for client", async ({ page }) => {
      console.log("=== Journey: Create Task ===");

      await page.goto(BASE_URL + "/#/clients");
      const firstRow = page.locator("table tbody tr").first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForLoadState("networkidle");
      }

      await page.waitForTimeout(500);

      // Look for tasks tab
      const tasksTab = page.locator("text=משימות, text=Tasks").first();
      if (await tasksTab.isVisible()) {
        await tasksTab.click();
        await page.waitForTimeout(500);
        console.log("✓ Clicked tasks tab");
      }

      await page.screenshot({ path: "audit-screenshots/journey-tasks-tab.png", fullPage: true });

      // Look for add task functionality
      const addTaskElements = await page.locator("input[placeholder*=task], input[placeholder*=משימה], button:has-text(Add), button:has-text(הוסף)").count();
      console.log("Add task elements found:", addTaskElements);
    });
  });

  // ============================================
  // USER JOURNEY: Privacy Consultant (יעל)
  // ============================================
  test.describe("Journey: Privacy Consultant", () => {

    test("J4: Review privacy submissions", async ({ page }) => {
      console.log("=== Journey: Review Privacy ===");

      await page.goto(BASE_URL + "/#/privacy");
      await page.waitForLoadState("networkidle");
      console.log("✓ Privacy page loaded");

      await page.screenshot({ path: "audit-screenshots/journey-privacy-list.png", fullPage: true });

      // Count submissions
      const submissions = page.locator("table tbody tr, [data-testid*=submission]");
      const count = await submissions.count();
      console.log("Submissions found:", count);

      // Click first submission if exists
      if (count > 0) {
        await submissions.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: "audit-screenshots/journey-privacy-detail.png", fullPage: true });
      }
    });

    test("J5: Check override controls", async ({ page }) => {
      console.log("=== Journey: Override Controls ===");

      await page.goto(BASE_URL + "/#/privacy");
      await page.waitForLoadState("networkidle");

      const submissions = page.locator("table tbody tr").first();
      if (await submissions.isVisible()) {
        await submissions.click();
        await page.waitForTimeout(1000);
      }

      // Look for override/validation controls
      const overrideElements = await page.locator("button:has-text(נכון), button:has-text(תקן), button:has-text(Correct), button:has-text(Override)").count();
      console.log("Override/validation buttons found:", overrideElements);

      await page.screenshot({ path: "audit-screenshots/journey-privacy-controls.png", fullPage: true });
    });
  });

  // ============================================
  // USER JOURNEY: Knowledge Analyst (אורי)
  // ============================================
  test.describe("Journey: Knowledge Analyst", () => {

    test("J6: Review RAG recordings", async ({ page }) => {
      console.log("=== Journey: RAG Inbox ===");

      await page.goto(BASE_URL + "/#/rag");
      await page.waitForLoadState("networkidle");
      console.log("✓ RAG page loaded");

      await page.screenshot({ path: "audit-screenshots/journey-rag-inbox.png", fullPage: true });

      // Count recordings
      const recordings = page.locator("table tbody tr, [data-testid*=recording]");
      const count = await recordings.count();
      console.log("Recordings found:", count);
    });
  });

  // ============================================
  // AI STUDIO MODULE (Phase 2)
  // ============================================
  test.describe("AI Studio Module", () => {

    test("J7: Open AI Studio", async ({ page }) => {
      console.log("=== Journey: AI Studio ===");

      await page.goto(BASE_URL + "/#/ai-studio");
      await page.waitForLoadState("networkidle");
      console.log("✓ AI Studio page loaded");

      await page.screenshot({ path: "audit-screenshots/journey-ai-studio.png", fullPage: true });

      // Check for chat interface elements
      const chatInput = page.locator("textarea, input[type=text]").last();
      const inputExists = await chatInput.isVisible();
      console.log("Chat input exists:", inputExists);

      // Check for Agent Mode toggle
      const agentToggle = page.locator("text=Agent, [data-testid*=agent], button:has-text(Agent)");
      let agentExists = false;
      try {
        agentExists = await agentToggle.first().isVisible();
      } catch (e) {
        agentExists = false;
      }
      console.log("Agent Mode toggle exists:", agentExists);
    });

    test("J8: Test Agent Mode chat", async ({ page }) => {
      console.log("=== Journey: Agent Mode Chat ===");

      await page.goto(BASE_URL + "/#/ai-studio");
      await page.waitForLoadState("networkidle");

      await page.screenshot({ path: "audit-screenshots/ai-studio-initial.png", fullPage: true });

      // Try to find and enable Agent Mode
      const agentModeBtn = page.locator("label:has-text(Agent), button:has-text(Agent), [role=switch]").first();
      if (await agentModeBtn.isVisible()) {
        await agentModeBtn.click();
        console.log("✓ Clicked Agent Mode toggle");
        await page.waitForTimeout(500);
      }

      // Find chat input
      const chatInput = page.locator("textarea, input[placeholder*=message], input[placeholder*=הודעה]").first();
      if (await chatInput.isVisible()) {
        await chatInput.fill("How many clients do we have?");
        console.log("✓ Typed test question");

        // Find send button
        const sendBtn = page.locator("button[type=submit], button:has-text(Send), button:has-text(שלח), button:has(svg)").last();
        if (await sendBtn.isVisible()) {
          console.log("✓ Send button found");
        }
      }

      await page.screenshot({ path: "audit-screenshots/ai-studio-agent-mode.png", fullPage: true });
    });
  });

  // ============================================
  // FEATURE INVENTORY
  // ============================================
  test.describe("Feature Inventory", () => {

    test("Clients Page Features", async ({ page }) => {
      console.log("=== Feature Inventory: Clients ===");

      await page.goto(BASE_URL + "/#/clients");
      await page.waitForLoadState("networkidle");

      const buttons = await page.locator("button").allTextContents();
      const inputs = await page.locator("input").count();
      const selects = await page.locator("select, [role=listbox]").count();

      console.log("Buttons:", buttons.filter(b => b.trim()));
      console.log("Input count:", inputs);
      console.log("Select count:", selects);

      await page.screenshot({ path: "audit-screenshots/inventory-clients.png", fullPage: true });
    });

    test("Navigation Features", async ({ page }) => {
      console.log("=== Feature Inventory: Navigation ===");

      await page.goto(BASE_URL);
      await page.waitForLoadState("networkidle");

      // List all nav items
      const navItems = await page.locator("nav a, aside a, [role=navigation] a").allTextContents();
      console.log("Navigation items:", navItems.filter(n => n.trim()));

      await page.screenshot({ path: "audit-screenshots/inventory-navigation.png", fullPage: true });
    });

    test("API Endpoints Check", async ({ request }) => {
      console.log("=== API Inventory ===");

      const endpoints = [
        "/health",
        "/api/clients",
        "/api/tasks",
        "/api/privacy/submissions",
        "/api/rag/inbox",
        "/api/ai-studio/chat"
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await request.get(API_URL + endpoint);
          console.log(endpoint + ": " + response.status());
        } catch (e) {
          console.log(endpoint + ": ERROR");
        }
      }
    });
  });
});
