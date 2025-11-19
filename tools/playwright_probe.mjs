import { chromium } from 'playwright';

async function main() {
  const url = process.argv[2] || 'http://localhost:4173/#/';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => logs.push({ type: 'pageerror', text: err.message }));

  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => ({ error: e.message }));
  const title = await page.title().catch(() => '');
  const content = await page.evaluate(() => document.body.innerText.substring(0, 200)).catch(() => '');
  const htmlLen = await page.evaluate(() => document.documentElement.outerHTML.length).catch(() => 0);
  const finalUrl = page.url();

  const shotPath = new URL('./playwright_probe.png', import.meta.url).pathname;
  await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});

  await browser.close();

  console.log(JSON.stringify({ url, finalUrl, ok: !!resp && !resp.error, status: resp?.status?.(), title, htmlLen, preview: content, logs, screenshot: shotPath }, null, 2));
}

main();
