import { Page, expect } from '@playwright/test';

/**
 * E2E Test Utilities
 * Common helpers for EISLAW E2E tests.
 */

/**
 * Wait for page to be fully loaded and idle
 */
export async function waitForPageReady(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(timeout);
}

/**
 * Navigate to a route and wait for ready state
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(`/#/${route}`);
  await waitForPageReady(page);
}

/**
 * Check if element is visible (returns false instead of throwing)
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).first().isVisible();
  } catch {
    return false;
  }
}

/**
 * Safe click - only clicks if element exists
 */
export async function safeClick(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  if (await element.isVisible().catch(() => false)) {
    await element.click();
    return true;
  }
  return false;
}

/**
 * Check if page shows empty state
 */
export async function hasEmptyState(page: Page): Promise<boolean> {
  const emptySelectors = [
    '[data-testid="empty-state"]',
    'text=אין',
    'text=No data',
    '.empty-state'
  ];

  for (const selector of emptySelectors) {
    if (await isVisible(page, selector)) {
      return true;
    }
  }
  return false;
}

/**
 * Navigate to first available client
 */
export async function navigateToFirstClient(page: Page): Promise<boolean> {
  await navigateTo(page, 'clients');

  if (await hasEmptyState(page)) {
    return false;
  }

  const openButton = page.locator('text=פתח').first();
  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click();
    await waitForPageReady(page);
    return true;
  }
  return false;
}

/**
 * Click on a specific tab in client detail page
 */
export async function clickTab(page: Page, tabName: string): Promise<boolean> {
  const tab = page.locator(`[role="tab"]:has-text("${tabName}")`).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/**
 * Verify page does not show 404 error
 */
export async function verifyPageLoaded(page: Page): Promise<void> {
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).not.toContain('404');
}

/**
 * Get current page route (hash-based)
 */
export function getCurrentRoute(page: Page): string {
  const url = page.url();
  const hashIndex = url.indexOf('#');
  return hashIndex >= 0 ? url.substring(hashIndex + 1) : '/';
}

/**
 * Wait for navigation to complete to a specific pattern
 */
export async function waitForNavigation(page: Page, urlPattern: RegExp, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForURL(urlPattern, { timeout });
    return true;
  } catch {
    return false;
  }
}
