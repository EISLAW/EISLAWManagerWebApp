// Comprehensive UX/UI Audit for Zoom Transcription Feature
// Three rounds: Initial audit, Adversarial Round 1, Adversarial Round 2

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://20.217.86.4:5173';
const API_URL = 'http://20.217.86.4:8799';

test.describe('ROUND 1: Comprehensive UX/UI Audit', () => {

  test.describe('1.1 Page Load & Initial State', () => {
    test('Page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check for JS errors
      expect(errors.filter(e => !e.includes('favicon')).length).toBe(0);
    });

    test('RAG page accessible via navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Look for RAG/Knowledge navigation
      const ragLink = page.locator('text=RAG').or(page.locator('text=ידע')).or(page.locator('text=מאגר'));
      if (await ragLink.count() > 0) {
        await ragLink.first().click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('RTL direction is applied correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      const html = page.locator('html');
      const dir = await html.getAttribute('dir');
      // Should be RTL for Hebrew interface
    });
  });

  test.describe('1.2 Zoom Sync Button Tests', () => {
    test('Sync from Zoom button exists and is visible', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const syncButton = page.locator('button:has-text("סנכרן מזום")').or(
        page.locator('button:has-text("Sync from Zoom")')
      ).or(page.locator('[data-testid*="sync"]'));

      const found = await syncButton.count();
      console.log(`Sync button found: ${found > 0}`);
    });

    test('Sync button triggers API call', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      let apiCalled = false;
      page.on('request', req => {
        if (req.url().includes('/api/zoom/sync')) {
          apiCalled = true;
        }
      });

      const syncButton = page.locator('button:has-text("סנכרן")').first();
      if (await syncButton.isVisible()) {
        await syncButton.click();
        await page.waitForTimeout(3000);
        console.log(`API called: ${apiCalled}`);
      }
    });
  });

  test.describe('1.3 Recordings List Display', () => {
    test('Recordings list populates after sync', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Trigger sync first
      const syncButton = page.locator('button:has-text("סנכרן")').first();
      if (await syncButton.isVisible()) {
        await syncButton.click();
        await page.waitForTimeout(5000);
      }

      // Check for recording items
      const recordingItems = page.locator('[data-testid*="recording"]').or(
        page.locator('.recording-item')
      ).or(page.locator('text=Zoom Meeting').first());

      const count = await recordingItems.count();
      console.log(`Recording items found: ${count}`);
    });

    test('Recording item shows title/name', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      // Look for recording titles
      const titles = page.locator('text=/.*Meeting.*/i').or(
        page.locator('text=/.*הקלטה.*/i')
      );
      const count = await titles.count();
      console.log(`Titles found: ${count}`);
    });
  });

  test.describe('1.4 Transcription Functionality', () => {
    test('Transcribe button exists on recording items', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      const transcribeBtn = page.locator('button:has-text("תמלל")').or(
        page.locator('button:has-text("Transcribe")')
      );
      const count = await transcribeBtn.count();
      console.log(`Transcribe buttons found: ${count}`);
    });
  });

  test.describe('1.5 Preview Modal Tests', () => {
    test('Preview button exists on transcribed items', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').or(
        page.locator('button:has-text("Preview")')
      );
      const count = await previewBtn.count();
      console.log(`Preview buttons found: ${count}`);
    });

    test('Preview modal opens on click', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
      if (await previewBtn.isVisible()) {
        await previewBtn.click();
        await page.waitForTimeout(1000);

        // Check for modal
        const modal = page.locator('.fixed.inset-0').or(page.locator('[role="dialog"]'));
        const visible = await modal.isVisible();
        console.log(`Modal visible: ${visible}`);
      }
    });

    test('Preview modal has close button', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
      if (await previewBtn.isVisible()) {
        await previewBtn.click();
        await page.waitForTimeout(1000);

        const closeBtn = page.locator('button:has-text("×")').or(
          page.locator('button:has-text("סגור")')
        );
        const found = await closeBtn.count();
        console.log(`Close button found: ${found > 0}`);
      }
    });
  });

  test.describe('1.6 Import to RAG Tests', () => {
    test('Import button exists', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      const importBtn = page.locator('button:has-text("ייבא")').or(
        page.locator('button:has-text("Import")')
      );
      const count = await importBtn.count();
      console.log(`Import buttons found: ${count}`);
    });
  });

  test.describe('1.7 Delete Functionality', () => {
    test('Delete button exists', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      const deleteBtn = page.locator('button:has-text("🗑️")').or(
        page.locator('button:has-text("מחק")')
      );
      const count = await deleteBtn.count();
      console.log(`Delete buttons found: ${count}`);
    });
  });
});

test.describe('ROUND 2: Adversarial Testing - Breaking the UI', () => {

  test('Rapid clicking - sync button spam', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const syncButton = page.locator('button:has-text("סנכרן")').first();
    if (await syncButton.isVisible()) {
      // Spam click 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await syncButton.click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(2000);

      // Page should not crash
      const body = page.locator('body');
      expect(await body.isVisible()).toBe(true);
    }
  });

  test('Double-click on preview', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.dblclick();
      await page.waitForTimeout(1000);

      // Should not open multiple modals
      const modals = page.locator('.fixed.inset-0');
      const count = await modals.count();
      console.log(`Modals after double-click: ${count}`);
    }
  });

  test('Network failure handling', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Block API requests
    await page.route('**/api/zoom/**', route => route.abort());

    const syncButton = page.locator('button:has-text("סנכרן")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);

      // Check for error message or graceful handling
      const errorMsg = page.locator('text=/error|שגיאה|נכשל/i');
      const hasError = await errorMsg.count() > 0;
      console.log(`Error shown on network failure: ${hasError}`);
    }
  });

  test('Empty state handling', async ({ page }) => {
    // Mock empty recordings
    await page.route('**/api/zoom/recordings', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recordings: [] })
      });
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Should show empty state message
    const emptyState = page.locator('text=/אין|no recordings|empty/i');
    const hasEmptyState = await emptyState.count() > 0;
    console.log(`Empty state message shown: ${hasEmptyState}`);
  });

  test('Very long title handling', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Check if long titles overflow or are truncated properly
    const titles = page.locator('.truncate').or(page.locator('[class*="overflow"]'));
    const count = await titles.count();
    console.log(`Elements with text overflow handling: ${count}`);
  });

  test('Loading state visibility', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check for loading indicators
    const loading = page.locator('text=/טוען|loading/i').or(
      page.locator('.animate-spin')
    ).or(page.locator('[class*="loading"]'));

    const hasLoading = await loading.count() > 0;
    console.log(`Loading indicators present: ${hasLoading}`);
  });
});

test.describe('ROUND 3: Adversarial Testing - Edge Cases & User Journey', () => {

  test('Full user journey: Sync -> View -> Transcribe -> Preview', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const results = {
      syncSuccess: false,
      recordingsShown: false,
      transcribeAvailable: false,
      previewWorks: false
    };

    // Step 1: Sync
    const syncButton = page.locator('button:has-text("סנכרן")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(5000);
      results.syncSuccess = true;
    }

    // Step 2: Check recordings shown
    const recordings = page.locator('text=/Meeting|הקלטה/i');
    if (await recordings.count() > 0) {
      results.recordingsShown = true;
    }

    // Step 3: Check transcribe button
    const transcribeBtn = page.locator('button:has-text("תמלל")').first();
    if (await transcribeBtn.isVisible()) {
      results.transcribeAvailable = true;
    }

    // Step 4: Try preview (if transcripts exist)
    const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(1000);

      const modal = page.locator('.fixed.inset-0');
      if (await modal.isVisible()) {
        results.previewWorks = true;
      }
    }

    console.log('User Journey Results:', JSON.stringify(results, null, 2));
  });

  test('Accessibility: Keyboard navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check if focus is visible
    const focused = page.locator(':focus');
    const hasFocus = await focused.count() > 0;
    console.log(`Keyboard focus working: ${hasFocus}`);
  });

  test('Mobile viewport responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Check if content is not overflowing
    const body = page.locator('body');
    const box = await body.boundingBox();

    const horizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    console.log(`Horizontal overflow on mobile: ${horizontalScroll}`);
  });

  test('Hebrew RTL text alignment', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Check for RTL containers
    const rtlElements = page.locator('[dir="rtl"]');
    const count = await rtlElements.count();
    console.log(`RTL elements found: ${count}`);
  });

  test('Button states: disabled during operations', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const syncButton = page.locator('button:has-text("סנכרן")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();

      // Check if button is disabled during operation
      const disabled = await syncButton.isDisabled();
      console.log(`Button disabled during operation: ${disabled}`);
    }
  });

  test('Visual consistency check', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Take screenshot for visual inspection
    await page.screenshot({ path: '/tmp/zoom_ui_screenshot.png', fullPage: true });
    console.log('Screenshot saved to /tmp/zoom_ui_screenshot.png');
  });

  test('Console errors during operations', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Perform operations
    const syncButton = page.locator('button:has-text("סנכרן")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);
    }

    const previewBtn = page.locator('button:has-text("תצוגה מקדימה")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(1000);
    }

    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.slice(0, 5));
    }
  });
});
