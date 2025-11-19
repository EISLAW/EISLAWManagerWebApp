const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:5197/#/clients');
  await page.getByTestId('add-client-header').click();
  await page.fill('input:below(:text("Name"))', 'UI Test Client');
  await page.fill('input:below(:text("Email"))', 'uitest@example.com');
  await page.getByTestId('add-client-submit').click();
  await page.waitForTimeout(1000);
  await browser.close();
  console.log('OK');
})();
