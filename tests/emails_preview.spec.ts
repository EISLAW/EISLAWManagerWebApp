import { test, expect } from '@playwright/test';

test('Indexed emails show preview on row click and no window.open is called', async ({ page }) => {
  // Stub window.open to detect unwanted Outlook opens
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._openCalls = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).open = () => { (window as any)._openCalls++; return { focus(){} } };
  });

  const name = 'Preview Client';
  const encoded = encodeURIComponent(name);

  // Mock summary
  await page.route('**/api/client/summary*', async (route) => {
    const data = { client: { name, emails: ['c@example.com'], phone: '', contacts: [] }, emails: [], files: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  // Mock indexed list with preview
  await page.route('**/email/by_client*', async (route) => {
    const body = { items: [
      { id: 'm1', received: '2025-01-05T09:00:00Z', subject: 'Welcome', from: 'alice@example.com', to: 'c@example.com', cc: '', preview: 'Hello Preview', json: '', eml: '' },
    ], total: 1, next_offset: null };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(`/#/clients/${encoded}?tab=emails`);
  const row = page.getByTestId('indexed-email-row').first();
  await expect(row).toBeVisible();
  const before = await page.evaluate(() => (window as any)._openCalls);
  await row.click();
  await expect(page.getByText('Hello Preview')).toBeVisible();
  const after = await page.evaluate(() => (window as any)._openCalls);
  // Clicking a row must not trigger window.open
  expect(after - before).toBe(0);
});
