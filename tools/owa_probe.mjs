// Quick Playwright probe: open Clients list and click Emails; capture popup URL
import { chromium } from '@playwright/test';

const APP = process.env.APP_URL || 'http://localhost:5173/#/clients';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const out = { app: APP, opened: false, url: '', ts: new Date().toISOString() };
  try {
    const popupPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null); const navPromise = page.waitForNavigation({ timeout: 8000 }).catch(() => null);
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    // Click the first "Emails" button if present
    const btn = page.getByRole('button', { name: 'Emails', exact: true }).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
    } else {
      // Fallback: open a client row then click client view button
      const openLink = page.getByRole('link', { name: /Open/ }).first();
      if (await openLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openLink.click();
        const cvBtn = page.getByTestId('open-emails');
        if (await cvBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await cvBtn.click();
        }
      }
    }
    const [popup] = await Promise.all([popupPromise, navPromise]);
    if (popup) {
      await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      out.opened = true;
      out.url = popup ? popup.url() : page.url(); out.opened = !!popup;
    }
  } catch (e) {
    out.error = String(e);
  } finally {
    console.log(JSON.stringify(out));
    await browser.close();
  }
})();


