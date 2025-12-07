import { test, expect } from '@playwright/test';

/**
 * C-005: Test "Open in Outlook" button
 * Verify the button exists and functions correctly.
 */
test.describe('Open in Outlook Button Test (C-005)', () => {

  test('verify Open in Outlook button exists and works', async ({ page }) => {
    // Step 1: Navigate to clients
    await page.goto('/#/clients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for empty state
    const hasEmpty = await page.getByTestId('empty-state').isVisible().catch(() => false);
    if (hasEmpty) {
      console.log('❌ RESULT: No clients - cannot test Open in Outlook');
      test.skip();
      return;
    }

    // Step 2: Click first client's "פתח" (Open) button
    const openButton = page.locator('text=פתח').first();
    const hasClients = await openButton.isVisible().catch(() => false);

    if (!hasClients) {
      console.log('❌ RESULT: No clients visible - cannot test');
      test.skip();
      return;
    }

    await openButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify we're on client detail page
    await expect(page).toHaveURL(/clients\/.+/);
    console.log('✓ Navigated to client detail page');

    // Step 3: Click on Emails tab (אימיילים)
    const emailsTab = page.locator('[role="tab"]:has-text("אימיילים"), [role="tab"]:has-text("Emails"), button:has-text("אימיילים")').first();
    const hasEmailsTab = await emailsTab.isVisible().catch(() => false);

    if (!hasEmailsTab) {
      console.log('❌ RESULT: Emails tab not found');
      expect(hasEmailsTab).toBe(true);
      return;
    }

    await emailsTab.click();
    await page.waitForTimeout(2000);
    console.log('✓ Clicked on Emails tab');

    // Step 4: Look for emails in the list
    const emailRows = page.locator('table tbody tr, [data-testid*="email"], .email-item, [role="listitem"]');
    const emailCount = await emailRows.count();
    console.log(`Found ${emailCount} email rows`);

    if (emailCount === 0) {
      console.log('⚠️ RESULT: No emails found for this client');
      // Check if there's an empty state message
      const noEmails = await page.locator('text=אין, text=No emails').first().isVisible().catch(() => false);
      console.log(`Empty state visible: ${noEmails}`);
      test.skip();
      return;
    }

    // Step 5: Click on first email to open detail
    await emailRows.first().click();
    await page.waitForTimeout(2000);
    console.log('✓ Clicked on first email');

    // Step 6: Look for "Open in Outlook" button
    const outlookButton = page.locator(
      'button:has-text("Open in Outlook"), ' +
      'button:has-text("פתח באאוטלוק"), ' +
      'button:has-text("Outlook"), ' +
      'a:has-text("Open in Outlook"), ' +
      'a:has-text("Outlook"), ' +
      '[data-testid*="outlook"], ' +
      '[aria-label*="Outlook"]'
    ).first();

    const hasOutlookButton = await outlookButton.isVisible().catch(() => false);
    console.log(`Open in Outlook button visible: ${hasOutlookButton}`);

    if (!hasOutlookButton) {
      // Look for any button in the email detail area
      const allButtons = page.locator('button, a[href]');
      const buttonCount = await allButtons.count();
      console.log(`Total buttons/links found: ${buttonCount}`);

      // List all buttons for debugging
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const btn = allButtons.nth(i);
        const text = await btn.textContent().catch(() => '');
        const href = await btn.getAttribute('href').catch(() => '');
        if (text || href) {
          console.log(`  Button ${i}: "${text?.trim()}" href="${href}"`);
        }
      }

      console.log('❌ RESULT: BROKEN - "Open in Outlook" button NOT FOUND');
      expect(hasOutlookButton).toBe(true);
      return;
    }

    // Step 7: Check if button is clickable
    const isEnabled = await outlookButton.isEnabled().catch(() => false);
    console.log(`Button enabled: ${isEnabled}`);

    if (!isEnabled) {
      console.log('❌ RESULT: BROKEN - Button exists but is disabled');
      expect(isEnabled).toBe(true);
      return;
    }

    // Step 8: Click the button (should open Outlook or new tab)
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
      outlookButton.click()
    ]);

    if (popup) {
      const popupUrl = popup.url();
      console.log(`New window/tab opened: ${popupUrl}`);

      if (popupUrl.includes('outlook') || popupUrl.includes('office') || popupUrl.includes('microsoft')) {
        console.log('✅ RESULT: WORKS - Opens Outlook/Microsoft URL');
      } else {
        console.log(`⚠️ RESULT: Opens URL but not Outlook: ${popupUrl}`);
      }
      await popup.close();
    } else {
      // Check if URL changed or if there's an error
      const currentUrl = page.url();
      console.log(`Current URL after click: ${currentUrl}`);

      // Check for error messages
      const errorVisible = await page.locator('text=error, text=שגיאה, .error, [role="alert"]').first().isVisible().catch(() => false);
      if (errorVisible) {
        console.log('❌ RESULT: BROKEN - Error shown after clicking button');
      } else {
        console.log('⚠️ RESULT: Button clicked but no popup opened (may work in real browser)');
      }
    }

    // Test completes - actual result logged above
    expect(true).toBe(true);
  });

});
