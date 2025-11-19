import { test, expect } from '@playwright/test';

test('Add Contact updates registry and shows chip (mocked)', async ({ page }) => {
  const name = 'Contact Test Co';
  const encoded = encodeURIComponent(name);
  let contacts: any[] = [];

  await page.route('**/api/client/summary*', async (route) => {
    const data = { client: { name, emails: ['owner@test.co'], phone: '', contacts }, emails: [], files: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/registry/clients', async (route) => {
    const body = route.request().postDataJSON();
    contacts = body?.contacts || contacts;
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/airtable/contacts_upsert', async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ contact_ids: ['rec1'] }) });
  });

  await page.goto(`/#/clients/${encoded}?tab=overview`);
  await page.getByTestId('add-contact-name').fill('John Doe');
  await page.getByTestId('add-contact-email').fill('john.doe@test.co');
  await page.getByTestId('add-contact-phone').fill('0500000000');
  await page.getByTestId('add-contact-submit').click();

  // Summary refetch updates chips
  await expect(page.getByRole('button', { name: /John Doe <john.doe@test.co>/ })).toBeVisible();
});

