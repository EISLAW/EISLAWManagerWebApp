import { chromium } from "playwright";

async function auditSettings() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("=== SETTINGS PAGE AUDIT ===");
  console.log("");

  // Go to main settings page
  await page.goto("http://localhost:5173/#/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({ path: "audit-screenshots/settings-main.png", fullPage: true });
  console.log("Screenshot: settings-main.png");

  // Get page title/header
  const headers = await page.locator("h1, h2, h3").allTextContents();
  console.log("");
  console.log("Headers found:", headers.filter(h => h.trim()).slice(0, 10));

  // Look for cards
  console.log("");
  console.log("=== LOOKING FOR SETTINGS CARDS ===");

  const expectedCards = [
    "תבניות הצעות מחיר",
    "ניקוד לידים",
    "תבניות פרומפטים",
    "אינטגרציות",
    "בעלים"
  ];

  for (const card of expectedCards) {
    const found = await page.locator(`text=${card}`).count();
    console.log(`${card}: ${found > 0 ? "FOUND" : "NOT FOUND"}`);
  }

  // Get all text content to see what's on the page
  console.log("");
  console.log("=== PAGE TEXT CONTENT ===");
  const bodyText = await page.locator("body").innerText();
  const lines = bodyText.split("\n").filter(l => l.trim()).slice(0, 30);
  for (const line of lines) {
    console.log("  ", line.substring(0, 60));
  }

  // Click on תבניות הצעות מחיר
  console.log("");
  console.log("=== CLICKING ON תבניות הצעות מחיר ===");

  const quoteTemplateBtn = page.locator("text=תבניות הצעות מחיר").first();
  if (await quoteTemplateBtn.isVisible()) {
    console.log("Found button, clicking...");
    await quoteTemplateBtn.click();
    await page.waitForTimeout(1500);

    const newUrl = page.url();
    console.log("New URL after click:", newUrl);

    await page.screenshot({ path: "audit-screenshots/settings-quotes-after-click.png", fullPage: true });
    console.log("Screenshot: settings-quotes-after-click.png");

    // Check what loaded
    const newHeaders = await page.locator("h1, h2, h3").allTextContents();
    console.log("Page headers:", newHeaders.filter(h => h.trim()).slice(0, 5));

    // Check for content
    const tables = await page.locator("table").count();
    const lists = await page.locator("ul, ol").count();
    const cards = await page.locator("[class*=card]").count();
    console.log("Tables:", tables, "| Lists:", lists, "| Cards:", cards);

    // Get visible text
    const pageText = await page.locator("main, [class*=content]").first().innerText().catch(() => "");
    console.log("");
    console.log("=== QUOTES PAGE CONTENT ===");
    const contentLines = pageText.split("\n").filter(l => l.trim()).slice(0, 20);
    for (const line of contentLines) {
      console.log("  ", line.substring(0, 60));
    }
  } else {
    console.log("ERROR: תבניות הצעות מחיר not visible!");

    // Try to find any clickable elements
    console.log("");
    console.log("Looking for alternative elements...");
    const links = await page.locator("a").allTextContents();
    console.log("Links:", links.filter(l => l.trim()).slice(0, 10));
  }

  await browser.close();
  console.log("");
  console.log("=== AUDIT COMPLETE ===");
}

auditSettings().catch(console.error);
