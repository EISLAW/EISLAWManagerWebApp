import { test, expect } from "@playwright/test";

test("CTO Review - Widgets Scroll", async ({ page }) => {
  // Go to client overview
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Check scrollable widgets
  const scrollables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[class*=overflow-y-auto]")).map(el => ({
      classes: el.className,
      height: el.scrollHeight,
      clientHeight: el.clientHeight,
      canScroll: el.scrollHeight > el.clientHeight,
      childCount: el.children.length
    }));
  });
  
  console.log("=== SCROLLABLE WIDGETS ===");
  scrollables.forEach((s, i) => {
    console.log(i + ". scrollHeight=" + s.height + " clientHeight=" + s.clientHeight + " canScroll=" + s.canScroll + " children=" + s.childCount);
    console.log("   classes: " + s.classes.substring(0, 80));
  });
  
  // Check emails widget specifically
  const emailsWidget = await page.evaluate(() => {
    const widgets = Array.from(document.querySelectorAll("[class*=max-h-][class*=overflow-y-auto]"));
    return widgets.map(w => ({
      hasEmails: w.innerHTML.includes("@"),
      height: w.scrollHeight,
      items: w.querySelectorAll("button, a, [role=button]").length
    }));
  });
  
  console.log("\n=== WIDGET DETAILS ===");
  emailsWidget.forEach((w, i) => {
    console.log(i + ". hasEmails=" + w.hasEmails + " scrollHeight=" + w.height + " clickableItems=" + w.items);
  });
  
  await page.screenshot({ path: "tests/cto-widgets.png", fullPage: true });
});

test("CTO Review - Link Airtable", async ({ page }) => {
  // Go to client detail
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Look for Airtable link button
  const airtableBtn = page.locator("text=Airtable לא מקושר").first();
  
  console.log("=== LINK AIRTABLE TEST ===");
  const btnVisible = await airtableBtn.isVisible().catch(() => false);
  console.log("Airtable not linked button visible: " + btnVisible);
  
  if (btnVisible) {
    // Get button details
    const box = await airtableBtn.boundingBox();
    console.log("Button height: " + (box?.height || 0) + "px");
    
    // Click to open link modal
    await airtableBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/cto-link-airtable-modal.png", fullPage: true });
    
    // Check what appeared
    const text = await page.evaluate(() => document.body.innerText);
    console.log("\nPage text after click (first 1000 chars):");
    console.log(text.substring(0, 1000));
    
    // Look for modal/dropdown content
    const hasSearch = text.includes("חיפוש") || text.includes("Search") || text.includes("Airtable");
    console.log("\nSearch/Airtable content visible: " + hasSearch);
    
    // Check for any input fields
    const inputs = await page.locator("input").count();
    console.log("Input fields visible: " + inputs);
  }
});

test("CTO Review - Find undersized button", async ({ page }) => {
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Find all buttons with height < 44px
  const smallBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).map(b => ({
      t: b.textContent?.trim().substring(0, 40),
      h: Math.round(b.getBoundingClientRect().height),
      w: Math.round(b.getBoundingClientRect().width),
      classes: b.className.substring(0, 60)
    })).filter(b => b.h > 0 && b.h < 44);
  });
  
  console.log("=== UNDERSIZED BUTTONS (<44px) ===");
  if (smallBtns.length === 0) {
    console.log("None found on this page!");
  } else {
    smallBtns.forEach((b, i) => {
      console.log(i + ". [" + b.h + "x" + b.w + "px]  + b.t + ");
      console.log("   classes: " + b.classes);
    });
  }
});
