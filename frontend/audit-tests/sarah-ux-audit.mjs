import { chromium } from "playwright";

const BASE_URL = "http://localhost:5173";
const SCREENSHOTS_DIR = "./audit-screenshots";

const results = {
  globalDesign: {},
  clientsList: {},
  clientOverview: {},
  privacy: {},
  rag: {},
  aiStudio: {},
  settingsQuotes: {},
  accessibility: {},
  debris: [],
  criticalIssues: []
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "he-IL"
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  console.log("\n========================================");
  console.log("   SARAH UX/UI AUDIT - STARTING");
  console.log("========================================\n");

  // ============================================
  // 1. CLIENTS LIST PAGE (CRITICAL)
  // ============================================
  console.log("\n--- CLIENTS LIST PAGE ---");
  try {
    await page.goto(`${BASE_URL}/#/clients`, { waitUntil: "networkidle" });
    await delay(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-clients-list.png`, fullPage: true });

    // Check page title
    const pageTitle = await page.locator("h1, h2, [data-testid*=title]").first().textContent();
    console.log("Page title:", pageTitle);
    results.clientsList.pageTitle = pageTitle;

    // Check search input
    const searchInput = await page.locator("input[type=text], input[type=search], input[placeholder]").first();
    if (await searchInput.isVisible()) {
      const placeholder = await searchInput.getAttribute("placeholder");
      console.log("Search placeholder:", placeholder);
      results.clientsList.searchPlaceholder = placeholder;
      results.clientsList.searchPlaceholderHebrew = /[\u0590-\u05FF]/.test(placeholder || "");
    }

    // Count client rows
    const rows = page.locator("table tbody tr, [data-testid*=client-row], .client-row");
    const rowCount = await rows.count();
    console.log("Client rows found:", rowCount);
    results.clientsList.rowCount = rowCount;

    // Check row heights for consistency
    if (rowCount > 0) {
      const heights = [];
      for (let i = 0; i < Math.min(5, rowCount); i++) {
        const box = await rows.nth(i).boundingBox();
        if (box) heights.push(box.height);
      }
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
      const heightVariation = Math.max(...heights) - Math.min(...heights);
      console.log("Row heights:", heights, "Variation:", heightVariation);
      results.clientsList.rowHeightConsistent = heightVariation < 5;
    }

    // Check filter/dropdown
    const filterBtn = page.locator("select, [role=listbox], button:has-text(סינון), button:has-text(סטטוס)").first();
    results.clientsList.hasFilter = await filterBtn.isVisible().catch(() => false);

    // Check for status badges
    const badges = page.locator(".badge, [class*=badge], [class*=status]");
    results.clientsList.hasBadges = (await badges.count()) > 0;

    // Check hover state
    if (rowCount > 0) {
      await rows.first().hover();
      await delay(200);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/01b-clients-hover.png`, fullPage: true });
    }

    console.log("PASS: Clients list audit complete");

  } catch (err) {
    console.error("FAIL: Clients list error:", err.message);
    results.clientsList.error = err.message;
  }

  // ============================================
  // 2. CLIENT OVERVIEW PAGE (CRITICAL)
  // ============================================
  console.log("\n--- CLIENT OVERVIEW PAGE ---");
  try {
    await page.goto(`${BASE_URL}/#/clients`, { waitUntil: "networkidle" });
    await delay(500);

    // Click first client row
    const firstRow = page.locator("table tbody tr, [data-testid*=client-row]").first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await delay(1000);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-client-overview.png`, fullPage: true });

      // Check client name in header
      const header = await page.locator("h1, h2, [data-testid*=client-name]").first().textContent();
      console.log("Client name in header:", header);
      results.clientOverview.clientName = header;

      // BUTTON INVENTORY - Critical for debris detection
      const buttons = page.locator("button");
      const btnCount = await buttons.count();
      const buttonInventory = [];
      console.log("\n=== BUTTON INVENTORY ===");
      for (let i = 0; i < btnCount; i++) {
        const btn = buttons.nth(i);
        const text = await btn.textContent();
        const visible = await btn.isVisible();
        const enabled = await btn.isEnabled();
        const box = await btn.boundingBox();

        if (visible && text?.trim()) {
          const btnInfo = {
            text: text.trim(),
            visible,
            enabled,
            width: box?.width,
            height: box?.height,
            isHebrew: /[\u0590-\u05FF]/.test(text)
          };
          buttonInventory.push(btnInfo);
          console.log(`  Button: "${text.trim()}" | enabled: ${enabled} | size: ${box?.width?.toFixed(0)}x${box?.height?.toFixed(0)}px`);
        }
      }
      results.clientOverview.buttons = buttonInventory;

      // Check tabs
      const tabs = page.locator("[role=tab], nav a, .tab, [data-testid*=tab], button[class*=tab]");
      const tabCount = await tabs.count();
      const tabLabels = [];
      console.log("\n=== TAB INVENTORY ===");
      for (let i = 0; i < tabCount; i++) {
        const label = await tabs.nth(i).textContent();
        if (label?.trim()) {
          tabLabels.push(label.trim());
          console.log(`  Tab: "${label.trim()}"`);
        }
      }
      results.clientOverview.tabs = tabLabels;

      // Screenshot each tab
      for (let i = 0; i < Math.min(tabCount, 6); i++) {
        try {
          await tabs.nth(i).click();
          await delay(500);
          const label = await tabs.nth(i).textContent();
          await page.screenshot({
            path: `${SCREENSHOTS_DIR}/02${String.fromCharCode(98 + i)}-tab-${label?.trim().replace(/\s+/g, "_")}.png`,
            fullPage: true
          });
        } catch (e) {
          console.log(`  Tab ${i} click failed: ${e.message}`);
        }
      }
    }

    console.log("PASS: Client overview audit complete");

  } catch (err) {
    console.error("FAIL: Client overview error:", err.message);
    results.clientOverview.error = err.message;
  }

  // ============================================
  // 3. PRIVACY PAGE (HIGH)
  // ============================================
  console.log("\n--- PRIVACY PAGE ---");
  try {
    await page.goto(`${BASE_URL}/#/privacy`, { waitUntil: "networkidle" });
    await delay(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-privacy.png`, fullPage: true });

    // Check RTL
    const htmlDir = await page.locator("html").getAttribute("dir");
    console.log("HTML dir attribute:", htmlDir);
    results.privacy.htmlDir = htmlDir;

    // Check main container direction
    const mainContainer = page.locator("main, .privacy, [class*=privacy]").first();
    if (await mainContainer.isVisible()) {
      const computedDir = await mainContainer.evaluate(el => getComputedStyle(el).direction);
      console.log("Main container direction:", computedDir);
      results.privacy.containerDir = computedDir;
    }

    // Check for two-panel layout
    const panels = page.locator(".grid > div, .flex > div, [class*=panel], [class*=sidebar]");
    const panelCount = await panels.count();
    console.log("Panels found:", panelCount);
    results.privacy.panelCount = panelCount;

    // Check for Hebrew labels
    const allText = await page.locator("body").innerText();
    const hebrewRatio = (allText.match(/[\u0590-\u05FF]/g) || []).length / allText.length;
    console.log("Hebrew text ratio:", (hebrewRatio * 100).toFixed(1) + "%");
    results.privacy.hebrewRatio = hebrewRatio;

    console.log("PASS: Privacy page audit complete");

  } catch (err) {
    console.error("FAIL: Privacy page error:", err.message);
    results.privacy.error = err.message;
  }

  // ============================================
  // 4. RAG PAGE (HIGH)
  // ============================================
  console.log("\n--- RAG PAGE ---");
  try {
    await page.goto(`${BASE_URL}/#/rag`, { waitUntil: "networkidle" });
    await delay(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-rag.png`, fullPage: true });

    // Check for tabs/sections
    const tabs = page.locator("[role=tab], .tab, button[class*=tab]");
    const tabCount = await tabs.count();
    console.log("RAG tabs found:", tabCount);
    results.rag.tabCount = tabCount;

    // Check inbox
    const inbox = page.locator("[class*=inbox], [data-testid*=inbox], table");
    results.rag.hasInbox = await inbox.isVisible().catch(() => false);

    // Check filter buttons
    const filterBtns = page.locator("button:has-text(הכל), button:has-text(ממתין), button:has-text(הושלם)");
    results.rag.hasFilters = (await filterBtns.count()) > 0;

    console.log("PASS: RAG page audit complete");

  } catch (err) {
    console.error("FAIL: RAG page error:", err.message);
    results.rag.error = err.message;
  }

  // ============================================
  // 5. AI STUDIO PAGE (HIGH - NEW)
  // ============================================
  console.log("\n--- AI STUDIO PAGE ---");
  try {
    await page.goto(`${BASE_URL}/#/ai-studio`, { waitUntil: "networkidle" });
    await delay(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-ai-studio.png`, fullPage: true });

    // Check chat input
    const chatInput = page.locator("input, textarea").last();
    const inputVisible = await chatInput.isVisible().catch(() => false);
    console.log("Chat input visible:", inputVisible);
    results.aiStudio.chatInputVisible = inputVisible;

    // Check send button
    const sendBtn = page.locator("button:has-text(שלח), button[type=submit], button:has(svg)").last();
    const sendVisible = await sendBtn.isVisible().catch(() => false);
    console.log("Send button visible:", sendVisible);
    results.aiStudio.sendButtonVisible = sendVisible;

    // Check Agent Mode toggle
    const agentToggle = page.locator("[class*=toggle], [role=switch], input[type=checkbox], button:has-text(Agent)");
    const toggleCount = await agentToggle.count();
    console.log("Toggle elements found:", toggleCount);
    results.aiStudio.hasAgentToggle = toggleCount > 0;

    // Check RTL
    const chatArea = page.locator("[class*=chat], [class*=message], main").first();
    if (await chatArea.isVisible()) {
      const dir = await chatArea.evaluate(el => getComputedStyle(el).direction);
      console.log("Chat area direction:", dir);
      results.aiStudio.chatDir = dir;
    }

    // Check for message styling
    const userMsg = page.locator("[class*=user-message], [class*=self], [class*=outgoing]");
    const aiMsg = page.locator("[class*=ai-message], [class*=bot], [class*=assistant], [class*=incoming]");
    results.aiStudio.hasUserMsgStyle = (await userMsg.count()) > 0;
    results.aiStudio.hasAiMsgStyle = (await aiMsg.count()) > 0;

    // Test sending a message
    if (inputVisible) {
      await chatInput.fill("בדיקה");
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/05b-ai-studio-with-input.png`, fullPage: true });
    }

    console.log("PASS: AI Studio audit complete");

  } catch (err) {
    console.error("FAIL: AI Studio error:", err.message);
    results.aiStudio.error = err.message;
  }

  // ============================================
  // 6. SETTINGS - QUOTES (MEDIUM)
  // ============================================
  console.log("\n--- SETTINGS - QUOTES ---");
  try {
    await page.goto(`${BASE_URL}/#/settings/quotes`, { waitUntil: "networkidle" });
    await delay(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-settings-quotes.png`, fullPage: true });

    // Check for categories list
    const categories = page.locator("[class*=category], li, tr");
    const catCount = await categories.count();
    console.log("Categories/items found:", catCount);
    results.settingsQuotes.itemCount = catCount;

    // Check for add button
    const addBtn = page.locator("button:has-text(הוסף), button:has-text(+), button:has-text(חדש)");
    results.settingsQuotes.hasAddButton = await addBtn.isVisible().catch(() => false);

    console.log("PASS: Settings - Quotes audit complete");

  } catch (err) {
    console.error("FAIL: Settings - Quotes error:", err.message);
    results.settingsQuotes.error = err.message;
  }

  // ============================================
  // 7. ACCESSIBILITY CHECK
  // ============================================
  console.log("\n--- ACCESSIBILITY CHECK ---");
  try {
    await page.goto(`${BASE_URL}/#/clients`, { waitUntil: "networkidle" });

    // Tab through elements for focus visibility
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      await delay(100);
    }
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-focus-test.png`, fullPage: true });

    // Navigate to client overview
    await page.goto(`${BASE_URL}/#/clients`, { waitUntil: "networkidle" });
    await page.locator("table tbody tr").first().click();
    await delay(500);

    // Check button sizes
    const buttons = page.locator("button");
    const btnCount = await buttons.count();
    const smallButtons = [];
    for (let i = 0; i < btnCount; i++) {
      const btn = buttons.nth(i);
      const visible = await btn.isVisible();
      if (visible) {
        const box = await btn.boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          const text = await btn.textContent();
          smallButtons.push({
            text: text?.trim(),
            width: Math.round(box.width),
            height: Math.round(box.height)
          });
        }
      }
    }
    console.log("Buttons smaller than 44px:", smallButtons.length);
    results.accessibility.smallButtons = smallButtons;

    console.log("PASS: Accessibility check complete");

  } catch (err) {
    console.error("FAIL: Accessibility check error:", err.message);
    results.accessibility.error = err.message;
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n========================================");
  console.log("   AUDIT SUMMARY");
  console.log("========================================");
  console.log("Console errors during audit:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log("Errors:", consoleErrors);
  }

  console.log("\n--- FULL RESULTS ---");
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
  return results;
}

runAudit().catch(console.error);
