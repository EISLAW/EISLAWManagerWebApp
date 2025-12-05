import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto("http://localhost:5173/#/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({ path: "audit-screenshots/settings-hebrew-only.png", fullPage: true });

  // Get page text
  const pageText = await page.locator("body").innerText();

  // Check for English subtitles that should be removed
  const hasPromptTemplates = pageText.includes("Prompt Templates");
  const hasLeadScoring = pageText.includes("Lead Scoring");
  const hasQuoteTemplates = pageText.includes("Quote Templates");
  const hasIntegrations = pageText.includes("Integrations");
  const hasOwners = pageText.includes("Owners");

  console.log("=== SETTINGS PAGE LANGUAGE CHECK ===");
  console.log("");
  console.log("English subtitles removed:");
  console.log("  'Prompt Templates':", hasPromptTemplates ? "STILL PRESENT" : "REMOVED ✓");
  console.log("  'Lead Scoring':", hasLeadScoring ? "STILL PRESENT" : "REMOVED ✓");
  console.log("  'Quote Templates':", hasQuoteTemplates ? "STILL PRESENT" : "REMOVED ✓");
  console.log("  'Integrations':", hasIntegrations ? "STILL PRESENT" : "REMOVED ✓");
  console.log("  'Owners':", hasOwners ? "STILL PRESENT" : "REMOVED ✓");

  // Check Hebrew titles are still there
  const hasHebrewPrompts = pageText.includes("תבניות פרומפטים");
  const hasHebrewLeads = pageText.includes("ניקוד לידים");
  const hasHebrewQuotes = pageText.includes("תבניות הצעות מחיר");
  const hasHebrewIntegrations = pageText.includes("אינטגרציות");
  const hasHebrewOwners = pageText.includes("בעלים");

  console.log("");
  console.log("Hebrew titles present:");
  console.log("  'תבניות פרומפטים':", hasHebrewPrompts ? "PRESENT ✓" : "MISSING");
  console.log("  'ניקוד לידים':", hasHebrewLeads ? "PRESENT ✓" : "MISSING");
  console.log("  'תבניות הצעות מחיר':", hasHebrewQuotes ? "PRESENT ✓" : "MISSING");
  console.log("  'אינטגרציות':", hasHebrewIntegrations ? "PRESENT ✓" : "MISSING");
  console.log("  'בעלים':", hasHebrewOwners ? "PRESENT ✓" : "MISSING");

  await browser.close();
  console.log("");
  console.log("Test complete!");
})();
