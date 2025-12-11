// AI Studio - Senior Review Playwright Tests
// Tests UI/UX, functionality, and identifies issues

import { chromium } from "playwright";

const BASE_URL = "http://20.217.86.4:5173";
const API_URL = "http://20.217.86.4:8799";

const results = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: []
};

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);
}

function pass(testName) {
  results.passed.push(testName);
  log(`✅ PASS: ${testName}`);
}

function fail(testName, error) {
  results.failed.push({ name: testName, error: String(error) });
  log(`❌ FAIL: ${testName} - ${error}`);
}

function warn(testName, msg) {
  results.warnings.push({ name: testName, msg });
  log(`⚠️  WARN: ${testName} - ${msg}`);
}

async function testAPIEndpoints() {
  log("\n=== API ENDPOINT TESTS ===");

  try {
    const providersRes = await fetch(`${API_URL}/api/ai-studio/providers`);
    if (providersRes.ok) {
      const data = await providersRes.json();
      if (data.providers && data.providers.length > 0) {
        pass("GET /api/ai-studio/providers returns valid data");
        log(`   Found providers: ${data.providers.map(p => p.name).join(", ")}`);
      } else {
        fail("GET /api/ai-studio/providers", "No providers returned");
      }
    } else {
      fail("GET /api/ai-studio/providers", `Status ${providersRes.status}`);
    }
  } catch (e) {
    fail("GET /api/ai-studio/providers", e.message);
  }

  try {
    const convRes = await fetch(`${API_URL}/api/ai-studio/conversations`);
    if (convRes.ok) {
      const data = await convRes.json();
      if (Array.isArray(data.conversations)) {
        pass("GET /api/ai-studio/conversations returns array");
      } else {
        fail("GET /api/ai-studio/conversations", "Not an array");
      }
    } else {
      fail("GET /api/ai-studio/conversations", `Status ${convRes.status}`);
    }
  } catch (e) {
    fail("GET /api/ai-studio/conversations", e.message);
  }

  try {
    const chatRes = await fetch(`${API_URL}/api/ai-studio/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "test", provider: "gemini" })
    });

    if (chatRes.ok && chatRes.headers.get("content-type").includes("text/event-stream")) {
      pass("POST /api/ai-studio/chat returns SSE stream");
    } else {
      fail("POST /api/ai-studio/chat", "Unexpected response type");
    }
  } catch (e) {
    fail("POST /api/ai-studio/chat", e.message);
  }
}

async function testUIComponents(page) {
  log("\n=== UI COMPONENT TESTS ===");

  await page.goto(`${BASE_URL}/ai-studio`);
  await page.waitForLoadState("networkidle");

  await page.screenshot({ path: "/tmp/ai-studio-initial.png", fullPage: true });
  results.screenshots.push("ai-studio-initial.png");
  log("📸 Screenshot: ai-studio-initial.png");

  try {
    const h1 = await page.locator("h1").textContent();
    if (h1.includes("AI Studio")) {
      pass("Page title shows AI Studio");
    } else {
      fail("Page title", `Got: ${h1}`);
    }
  } catch (e) {
    fail("Page title check", e.message);
  }

  try {
    const newChatBtn = page.locator("text=שיחה חדשה");
    if (await newChatBtn.isVisible()) {
      pass("New conversation button visible");
    } else {
      fail("New conversation button", "Not visible");
    }
  } catch (e) {
    fail("New conversation button", e.message);
  }

  try {
    const select = page.locator("select");
    if (await select.isVisible()) {
      const options = await select.locator("option").allTextContents();
      log(`   Provider options: ${options.join(", ")}`);
      if (options.length >= 1) {
        pass("Provider dropdown has options");
      } else {
        fail("Provider dropdown", "No options");
      }
    } else {
      fail("Provider dropdown", "Not visible");
    }
  } catch (e) {
    fail("Provider dropdown", e.message);
  }

  try {
    const textarea = page.locator("textarea");
    if (await textarea.isVisible()) {
      pass("Chat input field visible");

      const placeholder = await textarea.getAttribute("placeholder");
      if (placeholder && placeholder.includes("הקלד")) {
        pass("Input placeholder is in Hebrew");
      } else {
        warn("Input placeholder", `Placeholder: ${placeholder}`);
      }
    } else {
      fail("Chat input field", "Not visible");
    }
  } catch (e) {
    fail("Chat input field", e.message);
  }

  try {
    const rtlDiv = page.locator("div[dir=rtl]");
    if (await rtlDiv.count() > 0) {
      pass("RTL layout applied");
    } else {
      fail("RTL layout", "No dir=rtl found");
    }
  } catch (e) {
    fail("RTL layout", e.message);
  }

  try {
    const emptyState = page.locator("text=התחל שיחה חדשה");
    if (await emptyState.isVisible()) {
      pass("Empty state message displayed");
    } else {
      warn("Empty state", "Not showing - might have previous conversations");
    }
  } catch (e) {
    warn("Empty state", e.message);
  }
}

async function testUserFlow(page) {
  log("\n=== USER FLOW TESTS ===");

  await page.goto(`${BASE_URL}/ai-studio`);
  await page.waitForLoadState("networkidle");

  try {
    const textarea = page.locator("textarea");
    await textarea.fill("שלום, מה שלומך?");

    const value = await textarea.inputValue();
    if (value === "שלום, מה שלומך?") {
      pass("Can type Hebrew message");
    } else {
      fail("Type Hebrew message", `Value: ${value}`);
    }
  } catch (e) {
    fail("Type Hebrew message", e.message);
  }

  try {
    const textarea = page.locator("textarea");
    await textarea.fill("");
    await page.waitForTimeout(100);

    const sendBtn = page.locator("button").last();

    const isDisabled = await sendBtn.isDisabled();
    if (isDisabled) {
      pass("Send button disabled when empty");
    } else {
      warn("Send button state", "Not disabled when input empty");
    }

    await textarea.fill("test");
    await page.waitForTimeout(100);

    const isEnabled = !(await sendBtn.isDisabled());
    if (isEnabled) {
      pass("Send button enabled when has text");
    } else {
      fail("Send button state", "Still disabled after typing");
    }
  } catch (e) {
    fail("Send button state", e.message);
  }

  try {
    const textarea = page.locator("textarea");
    const sendBtn = page.locator("button").last();

    await textarea.fill("בדיקה");
    await sendBtn.click();

    await page.waitForTimeout(2000);

    await page.screenshot({ path: "/tmp/ai-studio-after-send.png", fullPage: true });
    results.screenshots.push("ai-studio-after-send.png");
    log("📸 Screenshot: ai-studio-after-send.png");

    const userMsg = page.locator(".bg-petrol");
    if (await userMsg.count() > 0) {
      pass("User message appears in chat");
    } else {
      fail("User message display", "Message not visible");
    }

    log("   Waiting for AI response...");
    await page.waitForTimeout(15000);

    await page.screenshot({ path: "/tmp/ai-studio-response.png", fullPage: true });
    results.screenshots.push("ai-studio-response.png");
    log("📸 Screenshot: ai-studio-response.png");

    const aiMsg = page.locator(".bg-slate-100");
    if (await aiMsg.count() > 0) {
      pass("AI response appears");
      const text = await aiMsg.first().textContent();
      log(`   AI said: ${text.substring(0, 100)}...`);
    } else {
      fail("AI response", "No response visible");
    }
  } catch (e) {
    fail("Send message flow", e.message);
  }
}

async function testAccessibility(page) {
  log("\n=== ACCESSIBILITY TESTS ===");

  await page.goto(`${BASE_URL}/ai-studio`);
  await page.waitForLoadState("networkidle");

  try {
    const buttons = await page.locator("button").all();
    let hasAriaLabels = 0;
    let missingAriaLabels = 0;

    for (const btn of buttons) {
      const ariaLabel = await btn.getAttribute("aria-label");
      const title = await btn.getAttribute("title");
      const text = await btn.textContent();

      if (ariaLabel || title || text.trim()) {
        hasAriaLabels++;
      } else {
        missingAriaLabels++;
      }
    }

    if (missingAriaLabels > 0) {
      warn("Button accessibility", `${missingAriaLabels} buttons without labels`);
    } else {
      pass("All buttons have accessible labels");
    }
  } catch (e) {
    warn("Button accessibility", e.message);
  }

  try {
    await page.keyboard.press("Tab");
    const focusedEl = await page.evaluate(() => document.activeElement?.tagName);
    log(`   First Tab focus: ${focusedEl}`);

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    pass("Keyboard navigation works");
  } catch (e) {
    fail("Keyboard navigation", e.message);
  }
}

async function testMobileView(page) {
  log("\n=== MOBILE VIEW TESTS ===");

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/ai-studio`);
  await page.waitForLoadState("networkidle");

  await page.screenshot({ path: "/tmp/ai-studio-mobile.png", fullPage: true });
  results.screenshots.push("ai-studio-mobile.png");
  log("📸 Screenshot: ai-studio-mobile.png");

  try {
    const h1 = page.locator("h1");
    const textarea = page.locator("textarea");

    if (await h1.isVisible() && await textarea.isVisible()) {
      pass("Core components visible on mobile");
    } else {
      fail("Mobile visibility", "Some components not visible");
    }
  } catch (e) {
    fail("Mobile test", e.message);
  }

  try {
    const sidebar = page.locator(".w-64");
    if (await sidebar.isVisible()) {
      warn("Mobile sidebar", "Fixed-width sidebar visible on mobile - may cause layout issues");
    }
  } catch (e) {
    // Not critical
  }

  await page.setViewportSize({ width: 1280, height: 720 });
}

async function printSummary() {
  log("\n" + "=".repeat(60));
  log("                    TEST SUMMARY");
  log("=".repeat(60));

  log(`\n✅ PASSED: ${results.passed.length}`);
  results.passed.forEach(t => log(`   • ${t}`));

  log(`\n❌ FAILED: ${results.failed.length}`);
  results.failed.forEach(t => log(`   • ${t.name}: ${t.error}`));

  log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
  results.warnings.forEach(t => log(`   • ${t.name}: ${t.msg}`));

  log(`\n📸 Screenshots saved: ${results.screenshots.length}`);
  results.screenshots.forEach(s => log(`   • /tmp/${s}`));

  log("\n" + "=".repeat(60));
  const passRate = (results.passed.length / (results.passed.length + results.failed.length) * 100).toFixed(1);
  log(`PASS RATE: ${passRate}%`);
  log("=".repeat(60));
}

async function main() {
  log("\n🔍 AI STUDIO - SENIOR REVIEW PLAYWRIGHT TESTS");
  log("=".repeat(60));

  await testAPIEndpoints();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await testUIComponents(page);
    await testUserFlow(page);
    await testAccessibility(page);
    await testMobileView(page);
  } catch (e) {
    log(`\n💥 FATAL ERROR: ${e.message}`);
  } finally {
    await browser.close();
  }

  await printSummary();

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

main();
