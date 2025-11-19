import { test, expect } from '@playwright/test';

test('nav parity with cloud labels', async ({ page }) => {
  await page.goto('/#/clients');
  await expect(page.getByText('EISLAW Web App')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Prompts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Marketing' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Clients' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'Marketing' }).click();
  await expect(page.getByTestId('marketing-title')).toBeVisible();
  await page.getByRole('link', { name: 'Prompts' }).click();
  await expect(page.getByTestId('prompts-title')).toBeVisible();
});

