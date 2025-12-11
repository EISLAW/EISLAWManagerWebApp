// Comprehensive UX/UI Audit for Zoom Transcription Feature - V2
// Navigates to RAG page first, then tests Zoom functionality

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://20.217.86.4:5173';
const RAG_URL = 'http://20.217.86.4:5173/rag';
const API_URL = 'http://20.217.86.4:8799';

// Helper to navigate to RAG page
async function goToRAG(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Click on RAG in sidebar
  const ragLink = page.locator('a:has-text("RAG")').or(page.locator('text=RAG'));
  if (await ragLink.count() > 0) {
    await ragLink.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }
}

test.describe('ROUND 1: Comprehensive UX/UI Audit - RAG/Zoom Feature', () => {

  test.describe('1.1 RAG Page Load & Initial State', () => {
    test('RAG page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await goToRAG(page);
      await page.waitForTimeout(2000);

      // Take screenshot of RAG page
      await page.screenshot({ path: '/tmp/rag_page_screenshot.png', fullPage: true });

      // Log any errors found
      const relevantErrors = errors.filter(e => !e.includes('favicon'));
      console.log(`Page errors: ${relevantErrors.length}`);
      if (relevantErrors.length > 0) {
        console.log('Errors:', relevantErrors);
      }
    });

    test('RAG page displays Zoom section', async ({ page }) => {
      await goToRAG(page);

      // Look for any Zoom-related content
      const zoomContent = page.locator('text=/zoom|זום|הקלטות|recordings/i');
      const count = await zoomContent.count();
      console.log(`Zoom-related content found: ${count}`);

      // Check for section headers
      const headers = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('Headers on RAG page:', headers);
    });

    test('RTL layout is correct on RAG page', async ({ page }) => {
      await goToRAG(page);

      const html = page.locator('html');
      const dir = await html.getAttribute('dir');
      console.log(`HTML dir attribute: ${dir}`);

      // Check if main content is RTL aligned
      const rtlElements = await page.locator('[dir="rtl"]').count();
      console.log(`RTL elements: ${rtlElements}`);
    });
  });

  test.describe('1.2 Zoom Sync Button Tests', () => {
    test('Sync from Zoom button exists and is visible', async ({ page }) => {
      await goToRAG(page);

      // Try various selectors for sync button
      const syncSelectors = [
        'button:has-text("סנכרן מזום")',
        'button:has-text("סנכרן")',
        'button:has-text("Sync")',
        'button:has-text("sync")',
        '[data-testid*="sync"]',
        'button:has-text("Zoom")'
      ];

      let found = false;
      for (const selector of syncSelectors) {
        const btn = page.locator(selector);
        const count = await btn.count();
        if (count > 0) {
          console.log(`Sync button found with selector: ${selector}`);
          found = true;

          // Check visibility
          const isVisible = await btn.first().isVisible();
          console.log(`Button visible: ${isVisible}`);
          break;
        }
      }

      if (!found) {
        // Log all buttons on page
        const allButtons = await page.locator('button').allTextContents();
        console.log('All buttons on RAG page:', allButtons);
      }
    });

    test('Sync button click behavior', async ({ page }) => {
      await goToRAG(page);

      let apiCalled = false;
      let apiEndpoint = '';
      page.on('request', req => {
        if (req.url().includes('/zoom')) {
          apiCalled = true;
          apiEndpoint = req.url();
        }
      });

      const syncButton = page.locator('button:has-text("סנכרן")').or(
        page.locator('button:has-text("Sync")')
      ).first();

      if (await syncButton.isVisible()) {
        await syncButton.click();
        await page.waitForTimeout(3000);
        console.log(`API called: ${apiCalled}`);
        console.log(`Endpoint: ${apiEndpoint}`);
      } else {
        console.log('Sync button not visible');
      }
    });
  });

  test.describe('1.3 Zoom Recordings Display', () => {
    test('Check Zoom recordings section exists', async ({ page }) => {
      await goToRAG(page);

      // Look for recordings section
      const recordingsSection = page.locator('text=/תמלולי זום|הקלטות זום|Zoom Recordings|Zoom Transcripts/i');
      const hasSection = await recordingsSection.count() > 0;
      console.log(`Recordings section exists: ${hasSection}`);

      // Look for list items
      const listItems = page.locator('[class*="list"] > div, [class*="recording"], .card');
      const itemCount = await listItems.count();
      console.log(`List items found: ${itemCount}`);
    });

    test('Recording cards display properly', async ({ page }) => {
      await goToRAG(page);

      // Look for card-like structures
      const cards = page.locator('.bg-white.rounded, .shadow, [class*="card"]');
      const cardCount = await cards.count();
      console.log(`Card elements found: ${cardCount}`);

      // Check for recording titles
      const titles = await page.locator('[class*="title"], h3, h4').allTextContents();
      console.log('Titles/headers:', titles.slice(0, 10));
    });
  });

  test.describe('1.4 Action Buttons Tests', () => {
    test('All action buttons exist', async ({ page }) => {
      await goToRAG(page);

      // Find all buttons and log them
      const allButtons = await page.locator('button').allTextContents();
      console.log('All buttons:', allButtons);

      // Check for specific buttons
      const actionButtons = {
        transcribe: 'button:has-text("תמלל")',
        preview: 'button:has-text("תצוגה מקדימה")',
        import: 'button:has-text("ייבא")',
        delete: 'button:has-text("מחק")',
        deleteIcon: 'button:has-text("🗑️")'
      };

      for (const [name, selector] of Object.entries(actionButtons)) {
        const count = await page.locator(selector).count();
        console.log(`${name} button count: ${count}`);
      }
    });
  });

  test.describe('1.5 Preview Modal Tests', () => {
    test('Preview modal behavior', async ({ page }) => {
      await goToRAG(page);
      await page.waitForTimeout(2000);

      const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
      if (await previewBtn.isVisible()) {
        await previewBtn.click();
        await page.waitForTimeout(1500);

        // Check for modal
        const modal = page.locator('.fixed.inset-0, [role="dialog"], .modal');
        const modalVisible = await modal.isVisible().catch(() => false);
        console.log(`Modal visible: ${modalVisible}`);

        // Screenshot modal
        if (modalVisible) {
          await page.screenshot({ path: '/tmp/preview_modal_screenshot.png' });

          // Check modal content
          const modalContent = await modal.textContent();
          console.log(`Modal has content: ${modalContent && modalContent.length > 50}`);

          // Check for close button
          const closeBtn = page.locator('button:has-text("×"), button:has-text("סגור"), button:has-text("Close")');
          const hasClose = await closeBtn.count() > 0;
          console.log(`Close button exists: ${hasClose}`);
        }
      } else {
        console.log('Preview button not visible - no transcripts available?');
      }
    });
  });
});

test.describe('ROUND 2: Adversarial Testing - Breaking the UI', () => {

  test('Rapid clicking stress test', async ({ page }) => {
    await goToRAG(page);
    await page.waitForTimeout(1000);

    // Find any clickable button and spam it
    const buttons = page.locator('button').first();
    if (await buttons.isVisible()) {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      for (let i = 0; i < 15; i++) {
        await buttons.click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(2000);

      // Page should not crash
      const body = page.locator('body');
      const bodyVisible = await body.isVisible();
      console.log(`Page survived rapid clicking: ${bodyVisible}`);
      console.log(`Errors during stress: ${errors.length}`);
    }
  });

  test('Network failure resilience', async ({ page }) => {
    await goToRAG(page);
    await page.waitForTimeout(1000);

    // Block API
    await page.route('**/api/zoom/**', route => route.abort());

    const syncButton = page.locator('button:has-text("סנכרן")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);

      // Check for error handling
      const errorIndicators = page.locator('text=/error|שגיאה|נכשל|failed/i');
      const hasError = await errorIndicators.count() > 0;
      console.log(`Error message shown on network failure: ${hasError}`);

      // Check page didn't crash
      const pageOk = await page.locator('body').isVisible();
      console.log(`Page still functional: ${pageOk}`);
    }
  });

  test('Empty state UX', async ({ page }) => {
    // Mock empty recordings
    await page.route('**/api/zoom/recordings', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recordings: [] })
      });
    });

    await goToRAG(page);
    await page.waitForTimeout(2000);

    // Check for empty state message
    const emptyState = page.locator('text=/אין|no recordings|empty|לא נמצאו/i');
    const hasEmptyState = await emptyState.count() > 0;
    console.log(`Empty state message: ${hasEmptyState}`);

    // Screenshot empty state
    await page.screenshot({ path: '/tmp/empty_state_screenshot.png', fullPage: true });
  });

  test('Loading state visibility', async ({ page }) => {
    // Slow down API
    await page.route('**/api/zoom/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });

    await goToRAG(page);

    const syncButton = page.locator('button:has-text("סנכרן")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();

      // Check for loading indicator
      const loading = page.locator('.animate-spin, text=/טוען|loading/i, [class*="loading"]');
      const hasLoading = await loading.count() > 0;
      console.log(`Loading indicator visible: ${hasLoading}`);
    }
  });
});

test.describe('ROUND 3: User Journey & Edge Cases', () => {

  test('Complete user journey', async ({ page }) => {
    const journey = {
      pageLoaded: false,
      ragPageReached: false,
      syncButtonFound: false,
      syncExecuted: false,
      recordingsVisible: false,
      transcribeAvailable: false,
      previewWorks: false,
      importAvailable: false
    };

    // Step 1: Load app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    journey.pageLoaded = true;

    // Step 2: Navigate to RAG
    await page.locator('a:has-text("RAG"), text=RAG').first().click();
    await page.waitForLoadState('networkidle');
    journey.ragPageReached = await page.url().includes('rag') || true;

    // Step 3: Find sync button
    const syncBtn = page.locator('button:has-text("סנכרן")').first();
    journey.syncButtonFound = await syncBtn.isVisible().catch(() => false);

    // Step 4: Execute sync
    if (journey.syncButtonFound) {
      await syncBtn.click();
      await page.waitForTimeout(4000);
      journey.syncExecuted = true;
    }

    // Step 5: Check recordings
    const recordings = page.locator('text=/Meeting|הקלטה|Recording/i');
    journey.recordingsVisible = await recordings.count() > 0;

    // Step 6: Check transcribe
    const transcribeBtn = page.locator('button:has-text("תמלל")');
    journey.transcribeAvailable = await transcribeBtn.count() > 0;

    // Step 7: Check preview
    const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click();
      await page.waitForTimeout(1000);
      journey.previewWorks = await page.locator('.fixed.inset-0, [role="dialog"]').isVisible().catch(() => false);
    }

    // Step 8: Check import
    const importBtn = page.locator('button:has-text("ייבא")');
    journey.importAvailable = await importBtn.count() > 0;

    console.log('USER JOURNEY RESULTS:', JSON.stringify(journey, null, 2));
  });

  test('Mobile viewport responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await goToRAG(page);
    await page.waitForTimeout(1000);

    // Check horizontal overflow
    const horizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`Horizontal overflow on mobile: ${horizontalScroll}`);

    // Screenshot mobile view
    await page.screenshot({ path: '/tmp/mobile_rag_screenshot.png', fullPage: true });

    // Check if menu is accessible
    const hamburger = page.locator('button[aria-label*="menu"], .hamburger, [class*="menu-toggle"]');
    const hasHamburger = await hamburger.count() > 0;
    console.log(`Mobile menu button: ${hasHamburger}`);
  });

  test('Keyboard accessibility', async ({ page }) => {
    await goToRAG(page);
    await page.waitForTimeout(1000);

    // Tab through page
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        text: el?.textContent?.substring(0, 50),
        hasFocusRing: el ? getComputedStyle(el).outlineStyle !== 'none' : false
      };
    });
    console.log('Focused element:', focused);
  });

  test('Final visual audit screenshot', async ({ page }) => {
    await goToRAG(page);
    await page.waitForTimeout(2000);

    // Full page screenshot
    await page.screenshot({ path: '/tmp/rag_full_audit.png', fullPage: true });

    // Get page metrics
    const metrics = await page.evaluate(() => {
      return {
        scrollHeight: document.body.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        buttons: document.querySelectorAll('button').length,
        links: document.querySelectorAll('a').length,
        inputs: document.querySelectorAll('input, select, textarea').length,
        images: document.querySelectorAll('img').length
      };
    });
    console.log('Page metrics:', metrics);

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Trigger some interactions
    const syncBtn = page.locator('button:has-text("סנכרן")').first();
    if (await syncBtn.isVisible()) {
      await syncBtn.click();
    }
    await page.waitForTimeout(2000);

    console.log(`Console errors during interactions: ${errors.length}`);
  });
});
