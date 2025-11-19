import { test, expect } from '@playwright/test';

test('ClientOverview SharePoint button opens popup', async ({ page }) => {
  // Mock backend responses used by the page
  await page.route('**/api/client/summary*', async (route) => {
    const url = new URL(route.request().url());
    const name = url.searchParams.get('name') || 'סיון בנימיני';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        client: { name, emails: ['sivan@example.com'], folder: '' },
        emails: [],
        files: [],
      }),
    });
  });
  await page.route('**/api/client/locations*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        localFolder: '',
        sharepointUrl: 'https://eislaw.sharepoint.com/sites/EISLAWTEAM/Shared%20Documents/%D7%9C%D7%A7%D7%95%D7%97%D7%95%D7%AA%20%D7%9E%D7%A9%D7%A8%D7%93/%D7%A1%D7%99%D7%95%D7%9F%20%D7%91%D7%A0%D7%99%D7%9E%D7%A0%D7%99',
      }),
    });
  });

  await page.goto('/#/clients/%D7%A1%D7%99%D7%95%D7%9F%20%D7%91%D7%A0%D7%99%D7%9E%D7%A0%D7%99?tab=overview');
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByTestId('open-sharepoint').click(),
  ]);
  const pu = popup.url();
  expect(pu.includes('sharepoint.com') || pu.includes('login.microsoftonline.com')).toBeTruthy();
  await popup.close();
});
