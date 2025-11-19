import { test, expect } from '@playwright/test';

test.describe('Clients Page', () => {
  test('loads clients page and shows content or empty-state', async ({ page }) => {
    page.on('console', m => console.log('console:', m.type(), m.text()));
    await page.goto('/#/clients');
    await page.waitForURL('**/#/clients');
    const bodyPreview = await page.evaluate(() => document.body.innerText.slice(0,200));
    console.log('preview:', bodyPreview);
    await page.waitForSelector('[data-testid="clients-title"]', { timeout: 15000 });
    await expect(page.getByTestId('clients-title')).toBeVisible();
    // Either a populated table or the empty-state card is present
    const hasEmpty = await page.getByTestId('empty-state').isVisible().catch(() => false);
    if (!hasEmpty) {
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('shows Open action when viewing indexed emails', async ({ page }) => {
    await page.route('**/email/by_client**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'test-email-id',
              received: '2025-11-13T10:23:00Z',
              subject: 'בדיקה',
              from: 'eitan@eislaw.co.il',
              to: 'rani@rdpri.com',
              cc: '',
              preview: 'Hello from automated test',
              json: '',
              eml: '',
              outlook_link: 'https://outlook.office.com/mail/inbox/id/test-email-id'
            }
          ],
          total: 1,
          mode: 'client',
          next_offset: null
        })
      });
    });
    await page.goto('/#/clients/%D7%A8%D7%A0%D7%99%20%D7%93%D7%91%D7%95%D7%A9?tab=emails');
    await page.waitForSelector('[data-testid="indexed-email-row"]', { timeout: 15000 });
    await page.locator('[data-testid="indexed-email-row"]').first().click();
    await expect(page.getByRole('button', { name: 'Open in Viewer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open in Outlook' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy Outlook Link' })).toBeVisible();
  });
});
