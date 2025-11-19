/*
  Fillout bulk submitter (Puppeteer)
  Usage examples:
    node tools/fillout_bulk_submit.mjs --email "eitan@eislaw.co.il" --count 10 \
      --form https://eislaw.fillout.com/t/t9nJNoMdBgus --name "בדיקת מערכת" --business "EISLAW"

  Notes:
  - Uses Puppeteer to drive the form heuristically across pages (Next/Continue/Submit).
  - Prefills common URL params: email, name, business_name, phone.
  - For each page: selects at least one radio/checkbox, fills inputs with simple values, then clicks Next.
  - Detects submission by presence of common success words (Hebrew/English) in the DOM.
*/

import puppeteer from 'puppeteer'

function arg(key, def = '') {
  const i = process.argv.indexOf(`--${key}`)
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1]
  return def
}

function buildUrl(base, params) {
  const u = new URL(base)
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) u.searchParams.set(k, String(v))
  })
  return u.toString()
}

async function answerPage(page) {
  // Try picking choices
  for (const sel of ['[role=radio]', 'input[type=radio]', '[role=checkbox]', 'input[type=checkbox]']) {
    const el = await page.$(sel)
    if (el) { try { await el.click({ delay: 20 }) } catch { } }
  }
  // Fill inputs
  const inputs = await page.$$('input:not([type=hidden]):not([type=radio]):not([type=checkbox])')
  for (const el of inputs) {
    try {
      const type = (await el.getAttribute('type')) || 'text'
      const v = type === 'number' ? '100' : 'בדיקה'
      if (await el.isIntersectingViewport()) await el.fill(v)
    } catch { }
  }
  // Fill textareas
  const tas = await page.$$('textarea')
  for (const el of tas) { try { if (await el.isIntersectingViewport()) await el.fill('בדיקה') } catch { } }

  // Try Next/Continue/Submit
  const labels = ['הבא', 'המשך', 'שלח', 'סיום', 'Submit', 'Next', 'Continue', 'Finish']
  for (const label of labels) {
    const btn = await page.$(`button:has-text("${label}")`)
    if (btn) { try { await btn.click({ delay: 20 }); return true } catch { } }
  }
  // Fallback click first visible button
  const any = await page.$('button')
  if (any) { try { await any.click({ delay: 20 }); return true } catch { } }
  return false
}

async function submitOnce({ form, email, name, business, phone, slow = false }) {
  const url = buildUrl(form, { email, name, business_name: business, phone })
  const browser = await puppeteer.launch({ headless: true, args: ['--lang=he-IL', '--no-sandbox'] })
  const page = await browser.newPage()
  // Reduce bot signals
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }) })
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36')

  let ok = false
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    for (let i = 0; i < 25; i++) {
      if (slow) await new Promise(r => setTimeout(r, 600))
      await answerPage(page)
      await new Promise(r => setTimeout(r, slow ? 800 : 400))
      const html = await page.content()
      if (/תודה|נשלח|הושלם|Submitted|Success|Thank/i.test(html)) { ok = true; break }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('submit error:', e?.message || e)
  } finally {
    await browser.close()
  }
  return ok
}

async function main() {
  const count = Number(arg('count', '10'))
  const email = arg('email')
  const form = arg('form', 'https://eislaw.fillout.com/t/t9nJNoMdBgus')
  if (!email) { console.error('Missing --email'); process.exit(2) }
  const name = arg('name', 'בדיקת מערכת')
  const business = arg('business', 'בדיקה בע"מ')
  const phone = arg('phone', '0500000000')
  const slow = arg('slow', 'false') === 'true'

  const results = []
  for (let i = 0; i < count; i++) {
    // Keep the same email unless user provides a template; optional plus addressing: name+T{i}@domain
    const ok = await submitOnce({ form, email, name: `${name} ${i + 1}`, business, phone, slow })
    results.push({ index: i + 1, ok })
    // brief jitter
    await new Promise(r => setTimeout(r, 500))
  }
  console.log(JSON.stringify({ form, email, count, results }))
}

main().catch(e => { console.error(e); process.exit(1) })

