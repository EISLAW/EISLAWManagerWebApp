import { test, expect } from '@playwright/test';

test('Word Templates modal lists and generates (mocked)', async ({ page }) => {
  const name = 'UI Word Client';
  const encoded = encodeURIComponent(name);

  await page.route('**/api/client/summary*', async (route) => {
    const data = { client: { name, emails: ['c@example.com'], folder: '' }, emails: [], files: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/word/templates', async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ templates: [{ name: 'טמפלייט מכתב.dotx', path: 'C:/Templates/טמפלייט מכתב.dotx' }] }) });
  });
  let generated = false;
  await page.route('**/word/generate', async (route) => {
    generated = true;
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true, path: 'C:/Clients/Doc.docx' }) });
  });

  await page.goto(`/#/clients/${encoded}?tab=overview`);
  await page.getByTestId('word-templates').click();
  await page.getByText('טמפלייט מכתב.dotx').click();
  await expect(page.getByText('Created:')).toBeVisible();
  expect(generated).toBeTruthy();
});

