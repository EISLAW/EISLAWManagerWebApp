import { test, expect } from "@playwright/test";

test("CTO Review - Emails Tab", async ({ page }) => {
  // Go directly to a client
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Click on Emails tab
  const emailsTab = page.getByText("אימיילים").first();
  await emailsTab.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "tests/cto-emails-tab.png", fullPage: true });
  
  // Get all text
  const text = await page.evaluate(() => document.body.innerText);
  console.log("=== EMAILS TAB TEXT ===");
  console.log(text.substring(0, 4000));
  
  // Find all buttons
  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).map(b => ({
      t: b.textContent?.trim().substring(0, 50),
      h: Math.round(b.getBoundingClientRect().height)
    }));
  });
  console.log("\n=== ALL BUTTONS ===");
  btns.forEach((b, i) => console.log(i + ". [" + b.h + "px] " + b.t));
  
  // Check for Outlook
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log("\n=== FEATURE CHECK ===");
  console.log("Outlook: " + html.includes("Outlook"));
  console.log("Create Task: " + (html.includes("Create Task") || html.includes("צור משימה")));
  console.log("Reply: " + (html.includes("Reply") || html.includes("השב")));
  console.log("פתח ב-Outlook: " + html.includes("פתח ב-Outlook"));
  
  // Click on first email to see detail
  const emailRow = page.locator("text=natesnewsletter").first();
  if (await emailRow.isVisible()) {
    console.log("\n=== CLICKING EMAIL ===");
    await emailRow.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/cto-email-detail.png", fullPage: true });
    
    const detail = await page.evaluate(() => document.body.innerText);
    console.log("\n=== EMAIL DETAIL ===");
    console.log(detail.substring(0, 2000));
    
    // Check buttons again
    const btns2 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button")).map(b => ({
        t: b.textContent?.trim().substring(0, 50),
        h: Math.round(b.getBoundingClientRect().height)
      }));
    });
    console.log("\n=== BUTTONS AFTER EMAIL CLICK ===");
    btns2.forEach((b, i) => console.log(i + ". [" + b.h + "px] " + b.t));
  }
});
