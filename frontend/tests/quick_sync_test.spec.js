import { test } from '@playwright/test';

test('Sync and screenshot', async ({ page }) => {
  await page.goto('http://20.217.86.4:5173');
  await page.waitForLoadState('networkidle');

  // Navigate to RAG
  await page.locator('text=RAG').first().click();
  await page.waitForTimeout(2000);

  // Click sync
  const syncBtn = page.locator('button:has-text("Sync from Zoom")');
  await syncBtn.click();
  await page.waitForTimeout(5000);

  // Take screenshot after sync
  await page.screenshot({ path: '/tmp/after_sync.png', fullPage: true });

  // Log what we find
  const allButtons = await page.locator('button').allTextContents();
  console.log('Buttons after sync:', allButtons);

  const cards = await page.locator('.bg-white').count();
  console.log('Cards found:', cards);
});
