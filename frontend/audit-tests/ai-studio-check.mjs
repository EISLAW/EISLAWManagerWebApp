import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("=== AI STUDIO CURRENT STATE ===\n");

  // Navigate directly to AI Studio - use domcontentloaded instead of networkidle
  await page.goto("http://localhost:5173/#/ai-studio", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Screenshot
  await page.screenshot({ path: "audit-screenshots/ai-studio-current.png", fullPage: true });
  console.log("Screenshot: ai-studio-current.png");

  // Check URL
  console.log("\nURL:", page.url());

  // Check page title
  const h1 = await page.locator("h1").first().textContent().catch(() => "none");
  const h2 = await page.locator("h2").first().textContent().catch(() => "none");
  console.log("\nH1:", h1);
  console.log("H2:", h2);

  // Check RTL
  const rtlElements = await page.locator("[dir='rtl']").count();
  console.log("\nElements with dir='rtl':", rtlElements);

  // Check chat input
  const textareas = await page.locator("textarea").count();
  const inputs = await page.locator("input[type='text']").count();
  console.log("\nTextareas:", textareas);
  console.log("Text inputs:", inputs);

  // Check if chat input is visible
  if (textareas > 0) {
    const chatInput = page.locator("textarea").first();
    const inputVisible = await chatInput.isVisible().catch(() => false);
    console.log("Chat input visible:", inputVisible);
  }

  // Check mobile viewport
  console.log("\n=== MOBILE VIEW (375x667) ===");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "audit-screenshots/ai-studio-mobile-current.png", fullPage: true });
  console.log("Mobile screenshot: ai-studio-mobile-current.png");

  await browser.close();
  console.log("\n=== CHECK COMPLETE ===");
})();
