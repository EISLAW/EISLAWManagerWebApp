import { test, expect } from '@playwright/test';

test('Emails (Indexed) panel renders and actions present', async ({ page }) => {
  // Prevent navigation to Outlook during this test
  await page.addInitScript(() => {
    // Return a stub window so app doesn't fallback to window.location.assign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).open = () => ({ focus: () => {}, location: '' });
  });
  const name = 'UI Email Client';
  const encoded = encodeURIComponent(name);

  // Mock summary with basic client data
  await page.route('**/api/client/summary*', async (route) => {
    const data = { client: { name, emails: ['client@example.com'], phone: '', contacts: [] }, emails: [], files: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  // Mock indexed list
  await page.route('**/email/by_client*', async (route) => {
    const body = { items: [
      { id: 'm1', received: '2025-01-05T09:00:00Z', subject: 'Welcome', from: 'alice@example.com', to: 'client@example.com', cc: '', json: '', eml: '' },
      { id: 'm2', received: '2025-01-04T09:00:00Z', subject: 'Proposal', from: 'bob@example.com', to: 'client@example.com', cc: '', json: '', eml: '' },
    ], total: 2, next_offset: null };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(`/#/clients/${encoded}?tab=emails`);
  await expect(page.getByText('Emails (Indexed)')).toBeVisible();
  const rows = page.getByTestId('indexed-email-row');
  await expect(rows).toHaveCount(2);
  // Expand first row and verify Reply/Forward appear in preview
  const firstRow = rows.first();
  await firstRow.click();
  await expect(page.getByRole('link', { name: 'Reply' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Forward' })).toBeVisible();
});
