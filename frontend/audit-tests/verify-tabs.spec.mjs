import { test, expect } from "@playwright/test";

const BASE_URL = "http://20.217.86.4:5173";

test.describe("Verify Tab Changes - David", () => {

  test("Client Detail has RAG and Privacy tabs", async ({ page }) => {
    console.log("=== Verifying Client Detail Tabs ===");

    // Go to client detail page
    await page.goto(BASE_URL + "/#/clients/%D7%A1%D7%99%D7%95%D7%9F%20%D7%91%D7%A0%D7%99%D7%9E%D7%99%D7%A0%D7%99");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check for all tabs
    const tabs = await page.locator("button, [role=tab], nav a").allTextContents();
    console.log("All tabs/buttons:", tabs.filter(t => t.trim()));

    // Verify RAG tab exists
    const ragTab = page.locator("text=RAG").first();
    const ragVisible = await ragTab.isVisible();
    console.log("RAG tab visible:", ragVisible);

    // Verify Privacy tab exists
    const privacyTab = page.locator("text=פרטיות").first();
    const privacyVisible = await privacyTab.isVisible();
    console.log("Privacy tab visible:", privacyVisible);

    await page.screenshot({ path: "audit-screenshots/verify-tabs-header.png" });

    // Click RAG tab
    if (ragVisible) {
      await ragTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "audit-screenshots/verify-rag-tab.png", fullPage: true });
      console.log("✓ RAG tab clicked and screenshot taken");
    }

    // Click Privacy tab
    if (privacyVisible) {
      await privacyTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "audit-screenshots/verify-privacy-tab.png", fullPage: true });
      console.log("✓ Privacy tab clicked and screenshot taken");
    }

    expect(ragVisible).toBe(true);
    expect(privacyVisible).toBe(true);
  });

  test("AI Studio shows Agent Mode label", async ({ page }) => {
    console.log("=== Verifying AI Studio Agent Mode ===");

    await page.goto(BASE_URL + "/#/ai-studio");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Check for Agent Mode label
    const agentModeBtn = page.locator("text=Agent Mode").first();
    const agentVisible = await agentModeBtn.isVisible();
    console.log("Agent Mode button visible:", agentVisible);

    // Verify Chat Mode is gone
    const chatModeExists = await page.locator("text=Chat Mode").count();
    console.log("Chat Mode text count:", chatModeExists);

    await page.screenshot({ path: "audit-screenshots/verify-agent-mode.png", fullPage: true });

    expect(agentVisible).toBe(true);
    expect(chatModeExists).toBe(0);
  });
});
