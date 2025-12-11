import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto("http://localhost:5173/#/clients", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Screenshot the new design
  await page.screenshot({ path: "audit-screenshots/sp-button-redesign.png", fullPage: true });

  // Check for folder icons in SVG
  const folderIcons = await page.locator("svg").filter({ has: page.locator("path") }).count();
  console.log("SVG icons on page:", folderIcons);

  // Check button sizes - buttons with the SharePoint tooltip
  const spButtons = await page.locator("button[title='פתח תיקיית SharePoint']").all();
  console.log("SP buttons with Hebrew tooltip:", spButtons.length);

  for (let i = 0; i < Math.min(3, spButtons.length); i++) {
    const box = await spButtons[i].boundingBox();
    console.log("Button", i, "size:", box?.width?.toFixed(0), "x", box?.height?.toFixed(0), "px");
    if (box && box.width >= 44 && box.height >= 44) {
      console.log("  ✓ Meets 44px minimum");
    } else {
      console.log("  ✗ Below 44px minimum");
    }
  }

  // Also check for any remaining "SP" text buttons
  const oldSpButtons = await page.locator("button:has-text('SP')").count();
  console.log("Old 'SP' text buttons remaining:", oldSpButtons);

  await browser.close();
  console.log("\nTest complete!");
})();
