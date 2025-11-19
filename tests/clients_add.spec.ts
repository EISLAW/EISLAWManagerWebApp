import { test, expect } from '@playwright/test';

test('add client modal creates and refreshes list (mocked)', async ({ page }) => {
  // Mock the key backend endpoints used by the modal
  await page.route('**/api/clients', async (route) => {
    const called = (route.request().postDataJSON?.()) as any;
    // Serve an initial empty list, then a list with the new client after POST
    const list = { value: [{ id: 'c1', name: 'Existing', emails: ['ex@example.com'] }] } as any;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route('**/sp/folder_create', (route) => route.fulfill({ status: 200, body: JSON.stringify({ created: true }) }));
  await page.route('**/airtable/clients_upsert', (route) => route.fulfill({ status: 200, body: JSON.stringify({ id: 'recNEW' }) }));
  await page.route('**/airtable/contacts_upsert', (route) => route.fulfill({ status: 200, body: JSON.stringify({}) }));
  // When registry upsert happens, cause subsequent /api/clients to include the new client
  let createdName = '';
  await page.route('**/registry/clients', async (route) => {
    const body = route.request().postDataJSON();
    createdName = body.display_name;
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    // Re-route /api/clients to include new client
    await page.route('**/api/clients', (r2) => r2.fulfill({ status: 200, body: JSON.stringify([{ id: 'new', name: createdName, emails: [body.email?.[0] || ''] }]) }));
  });

  await page.goto('/#/clients');
  await page.getByTestId('add-client-header').click();
  await page.locator('label:has-text("Name") input').first().fill('UI Test Add');
  await page.locator('label:has-text("Email") input').first().fill('ui@test.com');
  await page.getByTestId('add-client-submit').click();
  // Wait for the second /api/clients fetch after registry upsert
  await page.waitForTimeout(500);
  // Expect the new entry to be listed
  await expect(page.locator('table')).toContainText('UI Test Add');
});
