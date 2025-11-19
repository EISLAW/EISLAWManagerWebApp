import puppeteer from 'puppeteer';

const APP = process.env.APP_URL || 'http://localhost:5173/#/clients';
const CLIENT_NAME = process.env.CLIENT_NAME || 'יעל שמיר';

function log(obj){ console.log(JSON.stringify(obj)); }

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const out = { app: APP, client: CLIENT_NAME, steps: [], result: 'unknown', openCalls: 0, ts: new Date().toISOString() };
  try {
    await page.evaluateOnNewDocument(() => {
      // Count window.open calls
      window._openCalls = 0;
      const orig = window.open;
      window.open = (...args) => { window._openCalls++; try { return orig?.(...args) } catch { return null } };
    });

    await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 30000 });
    out.steps.push('clients_loaded');

    // Click the client name link in the table (anchor with exact text)
    const clicked = await page.evaluate((name)=>{
      const a = Array.from(document.querySelectorAll('a')).find(el => (el.textContent||'').trim() === name);
      if(a){ a.click(); return true }
      return false;
    }, CLIENT_NAME);
    if(clicked){ out.steps.push('clicked_client_name') }

    await page.waitForSelector('body', { timeout: 10000 });
    // Click Emails tab by text
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('*')).find(el => (el.textContent||'').trim() === 'Emails');
      btn && btn.click();
    });
    out.steps.push('emails_tab');

    // If indexed list exists, click the first row
    const rowSel = '[data-testid="indexed-email-row"]';
    const hasRow = await page.$(rowSel);
    if(hasRow){
      await page.click(rowSel);
      out.steps.push('clicked_indexed_row');
      // Expect preview text container to appear
      await page.waitForSelector('text=Reply', { timeout: 5000 });
      out.steps.push('preview_visible');
    } else {
      out.steps.push('no_indexed_rows');
    }

    // Read window.open calls (should be 0 in LOCAL)
    out.openCalls = await page.evaluate(() => (window._openCalls || 0));
    out.result = (out.openCalls === 0) ? 'ok' : 'window_open_called';
  } catch (e) {
    out.error = String(e);
    out.result = 'error';
  } finally {
    log(out);
    await browser.close();
  }
})();


