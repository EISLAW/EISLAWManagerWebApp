import { test, expect } from '@playwright/test';

test('update client via UI persists (mocked network)', async ({ page }) => {
  const name = 'UI Update Client';
  const encoded = encodeURIComponent(name);

  let currentEmail = 'old@example.com';
  await page.route('**/api/client/summary*', async (route) => {
    const data = { client: { name, emails: [currentEmail], folder: '' }, emails: [], files: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/registry/clients', async (route) => {
    currentEmail = route.request().postDataJSON()?.email?.[0] || currentEmail;
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/airtable/clients_upsert', (route) => route.fulfill({ status: 200, body: JSON.stringify({ updated: true }) }));

  await page.goto(`/#/clients/${encoded}?tab=overview`);
  await expect(page.getByText('Primary Email')).toBeVisible();
  await page.getByTestId('edit-client').click();
  const newEmail = `ui.updated.${Date.now()}@example.com`;
  await page.locator('label:has-text("Email") input').first().fill(newEmail);
  await page.getByTestId('save-client').click();
  // Assert inside the KPI card labeled "Primary Email" to avoid strict duplicates
  const kpi = page.locator('div.card', { has: page.getByText('Primary Email') });
  await expect(kpi.getByText(newEmail)).toBeVisible();
});
