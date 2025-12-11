import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("=== BUTTON SIZE AUDIT ===\n");

  // Clients List Page
  await page.goto("http://localhost:5173/#/clients", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const buttons = await page.locator("button").all();
  let smallButtons = [];
  let allButtons = [];

  for (const btn of buttons) {
    const visible = await btn.isVisible();
    if (!visible) continue;

    const text = await btn.textContent();
    const box = await btn.boundingBox();
    if (!box) continue;

    const info = {
      text: text?.trim().substring(0, 30) || "(no text)",
      width: Math.round(box.width),
      height: Math.round(box.height),
      pass: box.width >= 44 && box.height >= 44
    };

    allButtons.push(info);
    if (!info.pass) {
      smallButtons.push(info);
    }
  }

  console.log("CLIENTS LIST PAGE:");
  console.log("  Total visible buttons:", allButtons.length);
  console.log("  Buttons < 44px:", smallButtons.length);
  console.log("");

  if (smallButtons.length > 0) {
    console.log("  Small buttons found:");
    for (const btn of smallButtons) {
      console.log(`    - "${btn.text}" (${btn.width}x${btn.height}px)`);
    }
  }

  // Navigate to client detail
  await page.locator("table tbody tr").first().click();
  await page.waitForTimeout(1500);

  const detailButtons = await page.locator("button").all();
  let detailSmall = [];

  for (const btn of detailButtons) {
    const visible = await btn.isVisible();
    if (!visible) continue;

    const text = await btn.textContent();
    const box = await btn.boundingBox();
    if (!box) continue;

    if (box.width < 44 || box.height < 44) {
      detailSmall.push({
        text: text?.trim().substring(0, 30) || "(no text)",
        width: Math.round(box.width),
        height: Math.round(box.height)
      });
    }
  }

  console.log("\nCLIENT DETAIL PAGE:");
  console.log("  Small buttons found:", detailSmall.length);
  if (detailSmall.length > 0) {
    for (const btn of detailSmall) {
      console.log(`    - "${btn.text}" (${btn.width}x${btn.height}px)`);
    }
  }

  // Check Privacy page
  await page.goto("http://localhost:5173/#/privacy", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const privacyButtons = await page.locator("button").all();
  let privacySmall = [];

  for (const btn of privacyButtons) {
    const visible = await btn.isVisible();
    if (!visible) continue;

    const text = await btn.textContent();
    const box = await btn.boundingBox();
    if (!box) continue;

    if (box.width < 44 || box.height < 44) {
      privacySmall.push({
        text: text?.trim().substring(0, 30) || "(no text)",
        width: Math.round(box.width),
        height: Math.round(box.height)
      });
    }
  }

  console.log("\nPRIVACY PAGE:");
  console.log("  Small buttons found:", privacySmall.length);
  if (privacySmall.length > 0) {
    for (const btn of privacySmall) {
      console.log(`    - "${btn.text}" (${btn.width}x${btn.height}px)`);
    }
  }

  await browser.close();

  console.log("\n=== SUMMARY ===");
  const total = smallButtons.length + detailSmall.length + privacySmall.length;
  console.log("Total small buttons across pages:", total);
})();
