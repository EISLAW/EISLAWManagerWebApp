import { test, expect } from "@playwright/test";

const MIN_HEIGHT = 44;
const BASE_URL = "http://localhost:5173";

test("Privacy page button inventory", async ({ page }) => {
  await page.goto(BASE_URL + "/privacy");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Get all interactive elements
  const allButtons = await page.locator("button").all();
  const allLinks = await page.locator("a").all();
  const allClickables = await page.locator("[onclick], [role=button]").all();

  console.log("\n📋 PRIVACY PAGE INVENTORY:");
  console.log("Buttons: " + allButtons.length);
  console.log("Links: " + allLinks.length);
  console.log("Other clickables: " + allClickables.length);

  // Check each button
  for (let i = 0; i < allButtons.length; i++) {
    const btn = allButtons[i];
    const text = await btn.textContent() || "[no text]";
    const box = await btn.boundingBox();
    if (box) {
      const pass = box.height >= MIN_HEIGHT ? "✅" : "❌";
      console.log(pass + " Button: \"" + text.trim().substring(0, 40) + "\" = " + Math.round(box.height) + "px");
    }
  }

  // Take screenshot
  await page.screenshot({ path: "privacy-audit.png", fullPage: true });
  console.log("\nScreenshot saved: privacy-audit.png");
});

test("Client emails tab - Open in Outlook button", async ({ page }) => {
  await page.goto(BASE_URL + "/clients");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Click first client link
  const clientLink = page.locator("a[href*=\"/clients/\"]").first();
  await clientLink.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Click on emails tab (מיילים)
  const emailsTab = page.locator("text=מיילים").first();
  if (await emailsTab.count() > 0) {
    await emailsTab.click();
    await page.waitForTimeout(2000);
  }

  console.log("\n📋 CLIENT EMAILS TAB AUDIT:");

  // Find all buttons on page now
  const allButtons = await page.locator("button").all();
  console.log("Total buttons: " + allButtons.length);

  for (let i = 0; i < allButtons.length; i++) {
    const btn = allButtons[i];
    const text = await btn.textContent() || "[no text]";
    const box = await btn.boundingBox();
    if (box && box.height > 0) {
      const pass = box.height >= MIN_HEIGHT ? "✅" : "❌";
      console.log(pass + " \"" + text.trim().substring(0, 40) + "\" = " + Math.round(box.height) + "px");
    }
  }

  // Look specifically for Outlook-related buttons
  const outlookButtons = await page.locator("button:has-text(\"Outlook\"), button:has-text(\"פתח ב\")").all();
  console.log("\nOutlook buttons found: " + outlookButtons.length);

  await page.screenshot({ path: "client-emails-audit.png", fullPage: true });
});
