import { chromium } from 'playwright'

function seedTasks(client) {
  const parentId = 'task-parent-1'
  const subId = 'task-child-1'
  const now = new Date().toISOString()
  const tasks = [
    { id: parentId, title: 'Parent Task – Review', desc: '', status: 'new', clientName: client, ownerId: null, parentId: null, attachments: [], createdAt: now, updatedAt: now },
    { id: subId, title: 'Subtask A – Draft', desc: '', status: 'new', clientName: client, ownerId: null, parentId: parentId, attachments: [], createdAt: now, updatedAt: now },
  ]
  localStorage.setItem('eislaw.tasks.v1', JSON.stringify(tasks))
}

async function main() {
  const clientName = process.argv[2] || 'סיון בנימיני'
  const base = process.argv[3] || 'http://127.0.0.1:4173/#/'
  const url = base + 'clients/' + encodeURIComponent(clientName) + '?tab=tasks'
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.addInitScript(seedTasks, clientName)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })

  // Expect both parent and subtask text present; subtask prefixed with ↳
  const content = await page.textContent('body')
  const hasParent = content.includes('Parent Task – Review')
  const hasSub = content.includes('↳') && content.includes('Subtask A – Draft')

  // Expand details and check for Owner label
  const detailsBtn = await page.locator('button:text("Details")').first()
  let detailsOk = false
  try {
    await detailsBtn.click({ timeout: 3000 })
    await page.waitForSelector('text=Owner', { timeout: 3000 })
    detailsOk = true
  } catch {}

  console.log(JSON.stringify({ ok: hasParent && hasSub && detailsOk, hasParent, hasSub, detailsOk, url }, null, 2))
  await browser.close()
}

main()

