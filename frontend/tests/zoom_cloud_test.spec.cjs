// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://20.217.86.4:5173';
const API_URL = 'http://20.217.86.4:8799';

test.describe('Zoom Cloud Recordings Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to RAG page, ingest tab
    await page.goto(`${BASE_URL}/#/rag?tab=ingest`);
    await page.waitForLoadState('networkidle');
  });

  test('should display Zoom Cloud Recordings section', async ({ page }) => {
    // Check section exists
    const section = page.locator('[data-testid="rag.zoomCloudRecordings"]');
    await expect(section).toBeVisible({ timeout: 10000 });

    // Check sync button exists
    const syncButton = page.locator('[data-testid="rag.zoomCloud.sync"]');
    await expect(syncButton).toBeVisible();
  });

  test('should sync recordings from Zoom Cloud', async ({ page }) => {
    // Click sync button
    const syncButton = page.locator('[data-testid="rag.zoomCloud.sync"]');
    await syncButton.click();

    // Wait for sync to complete (button text changes)
    await expect(syncButton).not.toHaveText(/מסנכרן/, { timeout: 30000 });

    // Check recordings appear
    const recordings = page.locator('[data-testid^="rag.zoomCloud.item."]');
    const count = await recordings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter recordings by participant', async ({ page }) => {
    // First sync
    await page.locator('[data-testid="rag.zoomCloud.sync"]').click();
    await page.waitForTimeout(3000);

    // Enter filter
    const filterInput = page.locator('input[placeholder*="סנן לפי משתתף"]');
    await filterInput.fill('Eitan');
    await page.waitForTimeout(500);

    // Check filtered results
    const recordings = page.locator('[data-testid^="rag.zoomCloud.item."]');
    const count = await recordings.count();

    // Each visible recording should contain "Eitan"
    if (count > 0) {
      const firstRecording = recordings.first();
      await expect(firstRecording).toContainText(/Eitan/i);
    }
  });

  test('should show confirmation before skip', async ({ page }) => {
    // Sync first
    await page.locator('[data-testid="rag.zoomCloud.sync"]').click();
    await page.waitForTimeout(3000);

    // Find an "in_zoom" recording with skip button
    const skipButton = page.locator('button:has-text("דלג")').first();

    if (await skipButton.isVisible()) {
      // Set up dialog handler
      let dialogShown = false;
      page.on('dialog', async dialog => {
        dialogShown = true;
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss(); // Cancel
      });

      await skipButton.click();
      await page.waitForTimeout(500);

      expect(dialogShown).toBe(true);
    }
  });

  test('should show loading state on download button', async ({ page }) => {
    // Sync first
    await page.locator('[data-testid="rag.zoomCloud.sync"]').click();
    await page.waitForTimeout(3000);

    // Find download button
    const downloadButton = page.locator('[data-testid^="rag.zoomCloud.item."][data-testid$=".download"]').first();

    if (await downloadButton.isVisible()) {
      // Check button text before click
      await expect(downloadButton).toHaveText('הורד ותמלל');

      // Click and check it becomes disabled/loading
      await downloadButton.click();

      // Should show loading or be disabled
      await expect(downloadButton).toBeDisabled({ timeout: 2000 });
    }
  });

  test('should display error toast on API failure', async ({ page }) => {
    // Mock API failure
    await page.route(`${API_URL}/api/zoom/sync`, route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Server error' })
      });
    });

    // Click sync
    await page.locator('[data-testid="rag.zoomCloud.sync"]').click();
    await page.waitForTimeout(2000);

    // Check error toast appears
    const errorToast = page.locator('text=שגיאה');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('should show restore button for skipped recordings', async ({ page }) => {
    // Navigate and sync
    await page.locator('[data-testid="rag.zoomCloud.sync"]').click();
    await page.waitForTimeout(3000);

    // Look for a skipped recording with restore button
    const restoreButton = page.locator('button:has-text("שחזר")');

    // If there are skipped recordings, restore should be visible
    const count = await restoreButton.count();
    if (count > 0) {
      await expect(restoreButton.first()).toBeVisible();
    }
  });

  test('should support bulk selection', async ({ page }) => {
    // Sync first
    await page.locator('[data-testid="rag.zoomCloud.sync"]').click();
    await page.waitForTimeout(3000);

    // Look for "Select All" button
    const selectAllButton = page.locator('button:has-text("בחר הכל")');

    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();
      await page.waitForTimeout(500);

      // Check that selection controls appear
      const downloadSelectedButton = page.locator('button:has-text("הורד ותמלל נבחרים")');
      await expect(downloadSelectedButton).toBeVisible();
    }
  });
});

// API endpoint tests
test.describe('Zoom API Endpoints', () => {
  test('GET /api/zoom/recordings returns recordings', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/zoom/recordings`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('recordings');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.recordings)).toBeTruthy();
  });

  test('GET /api/zoom/queue returns queue status', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/zoom/queue`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('is_busy');
    expect(data).toHaveProperty('downloading');
    expect(data).toHaveProperty('transcribing');
  });

  test('GET /api/notifications returns notifications', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/notifications`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('notifications');
    expect(data).toHaveProperty('unread_count');
  });

  test('POST /api/zoom/restore returns success for skipped recording', async ({ request }) => {
    // First get a skipped recording
    const listResponse = await request.get(`${API_URL}/api/zoom/recordings?status=skipped`);
    const listData = await listResponse.json();

    if (listData.recordings.length > 0) {
      const zoomId = listData.recordings[0].zoom_id;

      const restoreResponse = await request.post(`${API_URL}/api/zoom/restore/${zoomId}`);
      expect(restoreResponse.ok()).toBeTruthy();

      const restoreData = await restoreResponse.json();
      expect(restoreData.success).toBeTruthy();
    }
  });
});
