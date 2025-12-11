import { test, expect } from "@playwright/test";

test("CTO Full Review", async ({ page }) => {
  // Go to clients
  await page.goto("http://localhost:5173/#/clients");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "tests/cto-v4-1-list.png", fullPage: true });
  
  // Find client links
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors
      .map(a => ({ href: a.href, text: a.textContent?.trim().substring(0, 30) }))
      .filter(l => l.href.includes("clients/") && l.href.split("/").length > 5);
  });
  
  console.log("Client links found: " + links.length);
  links.slice(0, 5).forEach(l => console.log("  " + l.text + " -> " + l.href));
  
  expect(links.length).toBeGreaterThan(0);
  
  // Navigate to first client
  if (links.length > 0) {
    await page.goto(links[0].href);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "tests/cto-v4-2-detail.png", fullPage: true });
    
    // Get page content
    const text = await page.evaluate(() => document.body.innerText);
    console.log("\n=== PAGE TEXT ===\n" + text.substring(0, 4000));
    
    // Get buttons
    const btns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button")).map(b => ({
        t: b.textContent?.trim().substring(0, 40),
        h: Math.round(b.getBoundingClientRect().height)
      }));
    });
    console.log("\n=== BUTTONS ===");
    btns.forEach((b, i) => console.log(i + ". [" + b.h + "px] " + b.t));
    
    // Check undersized buttons
    const smallBtns = btns.filter(b => b.h > 0 && b.h < 44);
    console.log("\n=== UNDERSIZED BUTTONS (<44px) ===");
    smallBtns.forEach(b => console.log("  [" + b.h + "px] " + b.t));
    
    // Check scrollables
    const scrolls = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[class*=overflow-y-auto]")).map(el => ({
        c: el.className.substring(0, 60),
        h: Math.round(el.getBoundingClientRect().height)
      }));
    });
    console.log("\n=== SCROLLABLE AREAS ===");
    scrolls.forEach((s, i) => console.log(i + ". h=" + s.h + "px " + s.c));
    
    // Feature checks
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log("\n=== FEATURE CHECKS ===");
    console.log("Outlook: " + html.includes("Outlook"));
    console.log("Create Task: " + (html.includes("Create Task") || html.includes("צור משימה")));
    console.log("Has emails: " + html.includes("@"));
  }
});
