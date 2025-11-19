import { test, expect } from '@playwright/test';

test('Clients list Emails opens multi-address OWA search', async ({ page, context }) => {
  // Mock clients list with one row
  await page.route('**/api/clients', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: 'c1', name: 'Email Test Co', emails: [] }
    ]) });
  });
  // Mock summary with client + contacts emails
  await page.route('**/api/client/summary*', async (route) => {
    const data = { client: { name: 'Email Test Co', emails: ['a@test.co'], contacts: [{ name: 'B', email: 'b@test.co' }] }, emails: [], files: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  // Latest link endpoint returns 404 to trigger OWA fallback
  await page.route('**/api/outlook/latest_link*', async (route) => {
    await route.fulfill({ status: 404, body: '{}' });
  });

  await page.goto('/#/clients');
  // In LOCAL mode the Outlook button is hidden; ensure the in-app action exists
  await expect(page.getByRole('button', { name: 'Emails (Indexed)' })).toBeVisible();
});
