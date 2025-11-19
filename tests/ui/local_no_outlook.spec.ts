import { test, expect } from '@playwright/test';

// Ensures that in LOCAL mode we do not open Outlook/OWA and that the Emails tab renders
// without triggering window.open. It navigates directly to a known route; data presence is optional.

test('LOCAL: Emails tab does not open Outlook and renders', async ({ page, baseURL }) => {
  let popupSeen = false;
  page.on('popup', () => { popupSeen = true });

  const target = `${baseURL}#/clients/%D7%99%D7%A2%D7%9C%20%D7%A9%D7%9E%D7%99%D7%A8?tab=emails`;
  await page.goto(target);

  // The Emails card title should appear even if there are no items.
  await expect(page.locator('text=Emails (Indexed)')).toBeVisible({ timeout: 15000 });

  // In LOCAL mode, no windows/popups should be opened automatically.
  expect(popupSeen).toBeFalsy();
});

