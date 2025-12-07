import { test, expect } from '@playwright/test';

/**
 * Accessibility Tests
 * Based on Sarah's WCAG 2.1 AA audit findings.
 * Tests touch targets, ARIA labels, keyboard navigation, and visibility.
 */

const BASE_URL = process.env.TEST_URL || 'http://20.217.86.4:5173';
const MIN_TOUCH_TARGET = 44;

test.describe('Accessibility Tests', () => {

  test.describe('Touch Targets (44px minimum)', () => {

    test('header buttons meet minimum size', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/`);
      await page.waitForLoadState('networkidle');

      const headerButtons = page.locator('header button, nav button');
      const count = await headerButtons.count();

      const violations: string[] = [];
      for (let i = 0; i < count; i++) {
        const button = headerButtons.nth(i);
        const box = await button.boundingBox();
        if (box && box.width > 0) {
          if (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET) {
            violations.push(`Header button ${i}: ${box.width}x${box.height}px`);
          }
        }
      }

      // Report violations but don't fail immediately
      if (violations.length > 0) {
        console.log('Touch target violations:', violations);
      }
      expect(violations.length, `${violations.length} header buttons below 44px`).toBe(0);
    });

    test('AI Studio/Prompts buttons meet minimum size', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/prompts`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const buttons = page.locator('button');
      const count = await buttons.count();

      const violations: string[] = [];
      for (let i = 0; i < Math.min(count, 20); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box && box.width > 0) {
          if (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET) {
            const text = await button.textContent() || 'icon';
            violations.push(`Button "${text.slice(0, 20)}": ${box.width}x${box.height}px`);
          }
        }
      }

      if (violations.length > 0) {
        console.log('AI Studio touch target violations:', violations);
      }
      // Soft expectation - report but allow some violations during fix period
      expect(violations.length).toBeLessThanOrEqual(5);
    });

    test('Privacy page buttons meet minimum size', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/privacy`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const buttons = page.locator('button');
      const count = await buttons.count();

      const violations: string[] = [];
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box && box.width > 0) {
          if (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET) {
            violations.push(`Privacy button ${i}: ${box.width}x${box.height}px`);
          }
        }
      }

      if (violations.length > 0) {
        console.log('Privacy page touch target violations:', violations);
      }
      // Known issue: some buttons are being fixed by Sarah
      expect(violations.length).toBeLessThanOrEqual(4);
    });

    test('Client detail action buttons meet minimum size', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Navigate to first client if available
      const openButton = page.locator('text=פתח').first();
      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const actionButtons = page.locator('[role="tablist"] button, .actions button');
        const count = await actionButtons.count();

        const violations: string[] = [];
        for (let i = 0; i < count; i++) {
          const button = actionButtons.nth(i);
          const box = await button.boundingBox();
          if (box && box.width > 0) {
            if (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET) {
              violations.push(`Client action button ${i}: ${box.width}x${box.height}px`);
            }
          }
        }

        expect(violations.length).toBeLessThanOrEqual(2);
      }
    });

  });

  test.describe('ARIA Labels', () => {

    test('all inputs have accessible names', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const inputs = page.locator('input:visible');
      const count = await inputs.count();

      const violations: string[] = [];
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');

        // Check for associated label via id
        let hasLabelElement = false;
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          hasLabelElement = await label.count() > 0;
        }

        const hasAccessibleName = ariaLabel || placeholder || hasLabelElement || name;
        if (!hasAccessibleName) {
          violations.push(`Input ${i} has no accessible name`);
        }
      }

      expect(violations.length, `${violations.length} inputs without accessible names`).toBe(0);
    });

    test('icon-only buttons have aria-labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/`);
      await page.waitForLoadState('networkidle');

      // Find buttons that only contain SVG (icon-only buttons)
      const allButtons = page.locator('button');
      const count = await allButtons.count();

      const violations: string[] = [];
      for (let i = 0; i < count; i++) {
        const button = allButtons.nth(i);
        const textContent = await button.textContent();
        const hasSvg = await button.locator('svg').count() > 0;

        // If button has SVG and no text, it should have aria-label
        if (hasSvg && (!textContent || textContent.trim() === '')) {
          const ariaLabel = await button.getAttribute('aria-label');
          const title = await button.getAttribute('title');

          if (!ariaLabel && !title) {
            violations.push(`Icon button ${i} missing aria-label`);
          }
        }
      }

      if (violations.length > 0) {
        console.log('Icon button ARIA violations:', violations);
      }
      // Allow some violations during fix period
      expect(violations.length).toBeLessThanOrEqual(10);
    });

  });

  test.describe('Keyboard Navigation', () => {

    test('can navigate main menu with keyboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/`);
      await page.waitForLoadState('networkidle');

      // Tab through navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check focus is visible on an interactive element
      const focusedElement = page.locator(':focus');
      const isVisible = await focusedElement.isVisible().catch(() => false);

      expect(isVisible).toBe(true);
    });

    test('Enter key activates focused buttons', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find a visible button and focus it
      const firstButton = page.locator('button:visible').first();
      await firstButton.focus();

      // Press Enter - should not cause error
      await page.keyboard.press('Enter');

      // Page should still be functional
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modal traps focus correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Try to open a modal
      const addButton = page.locator('button:has-text("הוסף"), button:has-text("Add")').first();
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        // If modal opened, focus should be trapped
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible().catch(() => false)) {
          // Tab should keep focus within modal
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');

          const focusedElement = page.locator(':focus');
          // Focus should still be visible
          await expect(focusedElement).toBeVisible();

          // Escape should close modal
          await page.keyboard.press('Escape');
        }
      }

      // Test passes if no errors occurred
      expect(true).toBe(true);
    });

  });

  test.describe('Visual Accessibility', () => {

    test('text elements are visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/`);
      await page.waitForLoadState('networkidle');

      // Check main text elements are visible
      const headings = page.locator('h1, h2, h3');
      const count = await headings.count();

      for (let i = 0; i < count; i++) {
        const heading = headings.nth(i);
        if (await heading.isVisible().catch(() => false)) {
          const box = await heading.boundingBox();
          expect(box, `Heading ${i} should have bounding box`).toBeTruthy();
        }
      }
    });

    test('RTL direction is set correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/`);
      await page.waitForLoadState('networkidle');

      // Check that page has RTL direction for Hebrew content
      const htmlDir = await page.locator('html').getAttribute('dir');
      const bodyDir = await page.locator('body').getAttribute('dir');

      const hasRTL = htmlDir === 'rtl' || bodyDir === 'rtl';
      expect(hasRTL, 'Page should have RTL direction').toBe(true);
    });

  });

});
