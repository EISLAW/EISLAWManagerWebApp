import { chromium } from 'playwright'

async function main() {
  const url = process.argv[2] || 'http://localhost:3000/#/rag'
  const apiBase = process.argv[3] || 'http://127.0.0.1:8080'
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  await context.addInitScript((base) => {
    try {
      localStorage.setItem('eislaw.apiBase', base)
    } catch {}
  }, apiBase)
  const page = await context.newPage()

  const result = { url, apiBase, ok: false, error: null, steps: [] }
  try {
    result.steps.push('goto')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })

    // Switch to ingest tab
    result.steps.push('click ingest tab')
    await page.getByText('קליטה ואישור', { exact: false }).click({ timeout: 10000 })

    // Click Edit in published section
    result.steps.push('click edit published')
    await page.getByText('Edit', { exact: true }).first().click({ timeout: 10000 })

    // Wait for reviewer header
    result.steps.push('wait reviewer')
    await page.getByText('Reviewer —', { exact: false }).waitFor({ timeout: 10000 })

    result.ok = true
  } catch (err) {
    result.error = err.message || String(err)
  } finally {
    const shotPath = new URL('./playwright_rag_edit_check.png', import.meta.url).pathname
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {})
    result.screenshot = shotPath
    await browser.close()
    console.log(JSON.stringify(result, null, 2))
  }
}

main()
