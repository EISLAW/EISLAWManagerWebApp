import { test, expect } from "@playwright/test";

const MIN_BUTTON_HEIGHT = 44;
const BASE_URL = "http://localhost:5173";

interface ButtonInfo {
  text: string;
  height: number;
  width: number;
  selector: string;
  passes: boolean;
}

async function auditButtonsOnPage(page: any, pageName: string): Promise<ButtonInfo[]> {
  const buttons: ButtonInfo[] = [];

  // Find all clickable elements: buttons, links with button role, elements with onclick
  const clickables = await page.locator("button, [role=button], a.btn, .btn, [class*=Button]").all();

  for (let i = 0; i < clickables.length; i++) {
    try {
      const el = clickables[i];
      const box = await el.boundingBox();
      if (box) {
        const text = await el.textContent() || await el.getAttribute("aria-label") || `[Button ${i}]`;
        buttons.push({
          text: text.trim().substring(0, 50),
          height: Math.round(box.height),
          width: Math.round(box.width),
          selector: `${pageName}:button[${i}]`,
          passes: box.height >= MIN_BUTTON_HEIGHT
        });
      }
    } catch (e) {
      // Skip elements that are not visible
    }
  }

  return buttons;
}

test.describe("Sarah - Button Height Audit", () => {

  test("TC-SARAH-01: Clients List - all buttons >= 44px", async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const buttons = await auditButtonsOnPage(page, "ClientsList");
    const failing = buttons.filter(b => !b.passes);

    console.log("\n📋 CLIENTS LIST BUTTON AUDIT:");
    console.log(`Total buttons: ${buttons.length}`);
    console.log(`Passing (>=44px): ${buttons.filter(b => b.passes).length}`);
    console.log(`Failing (<44px): ${failing.length}`);

    if (failing.length > 0) {
      console.log("\n❌ FAILING BUTTONS:");
      failing.forEach(b => console.log(`  - "${b.text}" = ${b.height}px`));
    }

    // Log all buttons for reference
    console.log("\n📊 ALL BUTTONS:");
    buttons.forEach(b => console.log(`  ${b.passes ? "✅" : "❌"} "${b.text}" = ${b.height}px x ${b.width}px`));

    expect(failing.length, `${failing.length} buttons below 44px minimum`).toBe(0);
  });

  test("TC-SARAH-02: Client Detail - all buttons >= 44px", async ({ page }) => {
    // Go to clients list first
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click first client name link to navigate to detail
    const clientLink = page.locator("a[href*=\"/clients/\"]").first();
    if (await clientLink.count() > 0) {
      await clientLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }

    const buttons = await auditButtonsOnPage(page, "ClientDetail");
    const failing = buttons.filter(b => !b.passes);

    console.log("\n📋 CLIENT DETAIL BUTTON AUDIT:");
    console.log(`Total buttons: ${buttons.length}`);
    console.log(`Passing (>=44px): ${buttons.filter(b => b.passes).length}`);
    console.log(`Failing (<44px): ${failing.length}`);

    if (failing.length > 0) {
      console.log("\n❌ FAILING BUTTONS:");
      failing.forEach(b => console.log(`  - "${b.text}" = ${b.height}px`));
    }

    console.log("\n📊 ALL BUTTONS:");
    buttons.forEach(b => console.log(`  ${b.passes ? "✅" : "❌"} "${b.text}" = ${b.height}px x ${b.width}px`));

    expect(failing.length, `${failing.length} buttons below 44px minimum`).toBe(0);
  });

  test("TC-SARAH-03: Privacy Page - all buttons >= 44px", async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const buttons = await auditButtonsOnPage(page, "Privacy");
    const failing = buttons.filter(b => !b.passes);

    console.log("\n📋 PRIVACY PAGE BUTTON AUDIT:");
    console.log(`Total buttons: ${buttons.length}`);
    console.log(`Passing (>=44px): ${buttons.filter(b => b.passes).length}`);
    console.log(`Failing (<44px): ${failing.length}`);

    if (failing.length > 0) {
      console.log("\n❌ FAILING BUTTONS:");
      failing.forEach(b => console.log(`  - "${b.text}" = ${b.height}px`));
    }

    console.log("\n📊 ALL BUTTONS:");
    buttons.forEach(b => console.log(`  ${b.passes ? "✅" : "❌"} "${b.text}" = ${b.height}px x ${b.width}px`));

    expect(failing.length, `${failing.length} buttons below 44px minimum`).toBe(0);
  });

  test("TC-SARAH-04: Verify Open in Outlook button exists and accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate to client detail
    const clientLink = page.locator("a[href*=\"/clients/\"]").first();
    if (await clientLink.count() > 0) {
      await clientLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }

    // Look for Open in Outlook button (Hebrew: פתח ב-Outlook)
    const outlookBtn = page.locator("button:has-text(\"Outlook\"), button:has-text(\"פתח\"), [aria-label*=\"Outlook\"]");
    const count = await outlookBtn.count();

    console.log("\n🔍 OPEN IN OUTLOOK VERIFICATION:");
    console.log(`Found ${count} Outlook-related button(s)`);

    if (count > 0) {
      const box = await outlookBtn.first().boundingBox();
      if (box) {
        console.log(`✅ Button height: ${box.height}px (min: 44px)`);
        expect(box.height).toBeGreaterThanOrEqual(MIN_BUTTON_HEIGHT);
      }
    }

    expect(count, "Open in Outlook button should exist").toBeGreaterThan(0);
  });

  test("TC-SARAH-05: RTL Alignment Check", async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check if document has RTL direction
    const htmlDir = await page.locator("html").getAttribute("dir");
    const bodyDir = await page.locator("body").getAttribute("dir");

    console.log("\n🔍 RTL ALIGNMENT CHECK:");
    console.log(`HTML dir: ${htmlDir || "not set"}`);
    console.log(`Body dir: ${bodyDir || "not set"}`);

    // Check computed styles for RTL
    const direction = await page.evaluate(() => {
      return window.getComputedStyle(document.body).direction;
    });
    console.log(`Computed direction: ${direction}`);

    // Check text alignment of main content
    const textAlign = await page.evaluate(() => {
      const main = document.querySelector("main") || document.body;
      return window.getComputedStyle(main).textAlign;
    });
    console.log(`Text align: ${textAlign}`);

    // For Hebrew app, should be RTL
    expect(direction).toBe("rtl");
  });
});
