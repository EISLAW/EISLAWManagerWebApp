/**
 * BRUTAL REVIEW - Playwright User Testing
 * Tests the SharePoint Document Generation Integration
 */
import { chromium } from 'playwright';

const BASE = "http://localhost:5173";
const RESULTS = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: []
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     BRUTAL REVIEW - PLAYWRIGHT USER TESTING                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'he-IL' });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ============================================
    // TEST 1: Homepage loads correctly
    // ============================================
    console.log("TEST 1: Homepage loads...");
    await page.goto(`${BASE}/#/clients`);
    await page.waitForLoadState("networkidle");

    const hasTable = await page.locator("table").count() > 0;
    if (hasTable) {
      RESULTS.passed.push("TEST 1: Homepage loads with client table");
    } else {
      RESULTS.failed.push("TEST 1: No client table found on homepage");
    }

    // ============================================
    // TEST 2: Find a client (סיון)
    // ============================================
    console.log("TEST 2: Finding client...");
    const clientLink = page.locator("a[href*='/clients/']", { hasText: "סיון" });
    const clientCount = await clientLink.count();

    if (clientCount > 0) {
      RESULTS.passed.push("TEST 2: Found client 'סיון' in list");
      await clientLink.first().click();
      await page.waitForLoadState("networkidle");
      await delay(2000);
    } else {
      RESULTS.failed.push("TEST 2: Could not find client 'סיון'");
      throw new Error("Cannot continue without client");
    }

    // ============================================
    // TEST 3: Client card Quick Actions visible
    // ============================================
    console.log("TEST 3: Checking Quick Actions...");
    const quickActions = page.locator("[data-testid='quick-actions']");
    if (await quickActions.count() > 0) {
      RESULTS.passed.push("TEST 3: Quick Actions section visible");
    } else {
      RESULTS.warnings.push("TEST 3: Quick Actions section not found (may need data-testid)");
    }

    // ============================================
    // TEST 4: Documents button exists and works
    // ============================================
    console.log("TEST 4: Testing Documents button...");
    const docsBtn = page.locator("[data-testid='btn-documents']");

    if (await docsBtn.count() > 0) {
      RESULTS.passed.push("TEST 4: Documents button found");
      await docsBtn.click();
      await delay(2000);
    } else {
      // Try alternative selectors
      const altBtn = page.locator("button", { hasText: "מסמכים" });
      if (await altBtn.count() > 0) {
        RESULTS.warnings.push("TEST 4: Documents button found by text, not data-testid");
        await altBtn.first().click();
        await delay(2000);
      } else {
        RESULTS.failed.push("TEST 4: Documents button not found");
      }
    }

    // ============================================
    // TEST 5: Template Picker Modal opens
    // ============================================
    console.log("TEST 5: Checking Template Picker Modal...");
    const modal = page.locator("[data-testid='template-picker-modal']");

    if (await modal.isVisible()) {
      RESULTS.passed.push("TEST 5: Template Picker modal opened");
      await page.screenshot({ path: "/tmp/review_modal_open.png" });
      RESULTS.screenshots.push("/tmp/review_modal_open.png");
    } else {
      RESULTS.failed.push("TEST 5: Template Picker modal did not open");
    }

    // ============================================
    // TEST 6: Templates load (SharePoint or fallback)
    // ============================================
    console.log("TEST 6: Checking templates load...");
    await delay(3000); // Wait for API call

    const templateItems = modal.locator(".divide-y > button, .divide-y > div");
    const templateCount = await templateItems.count();

    if (templateCount > 0) {
      RESULTS.passed.push(`TEST 6: ${templateCount} templates loaded`);

      // Check if from SharePoint
      const firstTemplate = await templateItems.first().textContent();
      console.log(`  First template: ${firstTemplate?.substring(0, 50)}...`);
    } else {
      // Check for loading or error state
      const loading = modal.locator("text=טוען");
      const noTemplates = modal.locator("text=לא נמצאו");

      if (await loading.count() > 0) {
        RESULTS.warnings.push("TEST 6: Still loading templates (slow API?)");
      } else if (await noTemplates.count() > 0) {
        RESULTS.failed.push("TEST 6: No templates found message shown");
      } else {
        RESULTS.failed.push("TEST 6: No templates visible and no status message");
      }
    }

    // ============================================
    // TEST 7: Generate a document
    // ============================================
    console.log("TEST 7: Generating document...");

    if (templateCount > 0) {
      await templateItems.first().click();
      console.log("  Clicked first template, waiting for generation...");

      // Wait for success or error
      let generationResult = "unknown";
      for (let i = 0; i < 80; i++) { // 8 seconds
        const successMsg = modal.locator(".bg-emerald-50, .bg-green-50");
        const errorMsg = modal.locator(".bg-red-50, .text-red");

        if (await successMsg.count() > 0) {
          const msg = await successMsg.textContent();
          RESULTS.passed.push(`TEST 7: Document generated - "${msg?.substring(0, 80)}"`);
          generationResult = "success";
          await page.screenshot({ path: "/tmp/review_generation_success.png" });
          RESULTS.screenshots.push("/tmp/review_generation_success.png");
          break;
        }

        if (await errorMsg.count() > 0) {
          const msg = await errorMsg.textContent();
          RESULTS.failed.push(`TEST 7: Generation error - "${msg}"`);
          generationResult = "error";
          await page.screenshot({ path: "/tmp/review_generation_error.png" });
          RESULTS.screenshots.push("/tmp/review_generation_error.png");
          break;
        }

        await delay(100);
      }

      if (generationResult === "unknown") {
        RESULTS.warnings.push("TEST 7: Generation status unclear after 8 seconds");
        await page.screenshot({ path: "/tmp/review_generation_timeout.png" });
      }
    } else {
      RESULTS.failed.push("TEST 7: Cannot test generation - no templates available");
    }

    // ============================================
    // TEST 8: Modal auto-closes after success
    // ============================================
    console.log("TEST 8: Checking modal auto-close...");
    await delay(3000);

    const modalStillVisible = await modal.isVisible();
    if (!modalStillVisible) {
      RESULTS.passed.push("TEST 8: Modal auto-closed after generation");
    } else {
      RESULTS.warnings.push("TEST 8: Modal still visible after 3 seconds");
    }

    // ============================================
    // TEST 9: SP Button behavior
    // ============================================
    console.log("TEST 9: Testing SharePoint button...");
    await page.goto(`${BASE}/#/clients`);
    await page.waitForLoadState("networkidle");
    await delay(1000);

    const spBtn = page.locator("[data-testid='sp-button']").first();
    if (await spBtn.count() > 0) {
      // Check if it's disabled or shows "להגדרה"
      const btnText = await spBtn.textContent();
      if (btnText?.includes("להגדרה")) {
        RESULTS.passed.push("TEST 9: SP button shows 'להגדרה' for unconfigured clients");
      } else {
        RESULTS.passed.push("TEST 9: SP button found");
      }
    } else {
      RESULTS.warnings.push("TEST 9: SP button not found with data-testid");
    }

    // ============================================
    // TEST 10: Files tab has SharePoint button
    // ============================================
    console.log("TEST 10: Checking Files tab...");
    await clientLink.first().click();
    await page.waitForLoadState("networkidle");
    await delay(2000);

    const filesTab = page.locator("button", { hasText: "קבצים" });
    if (await filesTab.count() > 0) {
      await filesTab.click();
      await delay(1000);

      const spInFiles = page.locator("button", { hasText: "SharePoint" });
      if (await spInFiles.count() > 0) {
        RESULTS.passed.push("TEST 10: Files tab has SharePoint button");
      } else {
        RESULTS.warnings.push("TEST 10: Files tab missing SharePoint button");
      }
    }

    // ============================================
    // TEST 11: API Health Check
    // ============================================
    console.log("TEST 11: API Health Check...");
    const apiResponse = await page.evaluate(async () => {
      try {
        const resp = await fetch('http://localhost:8799/word/health');
        return await resp.json();
      } catch (e) {
        return { error: e.message };
      }
    });

    if (apiResponse.graph_connected && apiResponse.sharepoint_connected) {
      RESULTS.passed.push("TEST 11: API connected to SharePoint");
    } else if (apiResponse.error) {
      RESULTS.failed.push(`TEST 11: API health check failed - ${apiResponse.error}`);
    } else {
      RESULTS.warnings.push(`TEST 11: API partial connection - graph:${apiResponse.graph_connected}, sp:${apiResponse.sharepoint_connected}`);
    }

    // ============================================
    // TEST 12: Console errors check
    // ============================================
    console.log("TEST 12: Checking for console errors...");
    if (consoleErrors.length === 0) {
      RESULTS.passed.push("TEST 12: No console errors during testing");
    } else {
      RESULTS.warnings.push(`TEST 12: ${consoleErrors.length} console errors found`);
      consoleErrors.slice(0, 3).forEach(e => {
        console.log(`  Console error: ${e.substring(0, 100)}`);
      });
    }

    // Final screenshot
    await page.screenshot({ path: "/tmp/review_final_state.png" });
    RESULTS.screenshots.push("/tmp/review_final_state.png");

  } catch (error) {
    RESULTS.failed.push(`CRITICAL ERROR: ${error.message}`);
    await page.screenshot({ path: "/tmp/review_error.png" });
  } finally {
    await browser.close();
  }

  // ============================================
  // RESULTS SUMMARY
  // ============================================
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    TEST RESULTS SUMMARY                      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log(`✅ PASSED (${RESULTS.passed.length}):`);
  RESULTS.passed.forEach(t => console.log(`   ${t}`));

  console.log(`\n⚠️  WARNINGS (${RESULTS.warnings.length}):`);
  RESULTS.warnings.forEach(t => console.log(`   ${t}`));

  console.log(`\n❌ FAILED (${RESULTS.failed.length}):`);
  RESULTS.failed.forEach(t => console.log(`   ${t}`));

  console.log(`\n📸 Screenshots: ${RESULTS.screenshots.join(", ")}`);

  // Calculate score
  const total = RESULTS.passed.length + RESULTS.warnings.length + RESULTS.failed.length;
  const score = ((RESULTS.passed.length + RESULTS.warnings.length * 0.5) / total * 10).toFixed(1);

  console.log(`\n══════════════════════════════════════════════════════════════`);
  console.log(`PLAYWRIGHT TEST SCORE: ${score}/10`);
  console.log(`══════════════════════════════════════════════════════════════`);

  return { ...RESULTS, score };
}

runTests().catch(console.error);
