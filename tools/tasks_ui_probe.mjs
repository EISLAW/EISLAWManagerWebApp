import { chromium } from 'playwright'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

async function main() {
  const baseApp = process.env.APP_URL || 'http://localhost:5173/#/'
  const api = process.env.API_URL || 'http://127.0.0.1:8788'

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(3000)
  const logs = []
  page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }))
  page.on('pageerror', (err) => logs.push({ type: 'pageerror', text: err.message }))

  const out = { steps: [], errors: [], client: null }
  function step(name, extra = {}) { out.steps.push({ name, ...extra }) }
  function err(name, e) { out.errors.push({ name, error: String(e) }) }

  // Discover one client from API via Playwright's request API
  let clientName = 'אישי'
  try {
    const resp = await page.request.get(`${api}/api/clients`)
    if (resp.ok()) {
      const arr = await resp.json()
      if (Array.isArray(arr) && arr.length && arr[0].name) clientName = arr[0].name
    }
  } catch {}
  const appRoot = baseApp.replace(/#\/?$/, '#/')
  const target = `${appRoot}clients/${encodeURIComponent(clientName)}?tab=tasks`
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 })
  out.client = clientName
  step('open_client_tasks', { url: page.url(), client: clientName })

  // Add a root task
  try {
    await page.getByPlaceholder(new RegExp('^Do X for')).fill('Probe Task 1')
    await page.getByRole('button', { name: 'Add' }).click()
    await page.waitForTimeout(300)
    step('add_root_task_ok')
  } catch (e) { err('add_root_task', e) }

  // Open the first task modal
  try {
    await page.getByRole('button', { name: 'Open' }).first().click()
    await page.getByTestId('task-modal').waitFor({ timeout: 3000 })
    const title = await page.getByTestId('task-title').innerText()
    step('open_modal_ok', { title })
  } catch (e) { err('open_modal', e) }

  // Add a subtask
  try {
    // pick generic selector: the first subtask input visible
    const subInputs = page.locator('[data-testid^="tm.subtask.input."]')
    await subInputs.first().fill('Sub A')
    await page.getByTestId('tm.subtask.add').click()
    await page.waitForTimeout(200)
    step('add_subtask_ok')
  } catch (e) { err('add_subtask', e) }

  // Toggle complete
  try {
    await page.getByTestId('tm.task.complete').first().click()
    await page.waitForTimeout(100)
    step('toggle_done_ok')
  } catch (e) { err('toggle_done', e) }

  // Set priority (try choose first option)
  try {
    await page.getByTestId('tm.task.priority.open').first().click()
    await page.locator('button:has-text("גבוהה")').first().click({ timeout: 1000 })
    const ptxt = await page.getByTestId('tm.task.priority.open').first().innerText()
    step('set_priority_ok', { text: ptxt })
  } catch (e) { err('priority_menu', e) }

  // Set due date (type into date input and save)
  try {
    await page.getByTestId('tm.task.due.open').first().click()
    await page.locator('input[type="date"]').first().fill('2025-12-31')
    await page.getByRole('button', { name: 'שמור' }).click()
    const dtxt = await page.getByTestId('tm.task.due.open').first().innerText()
    step('set_due_ok', { text: dtxt })
  } catch (e) { err('due_set', e) }

  // Assign owner (pick first)
  try {
    await page.getByTestId('tm.task.assignee.open').first().click()
    await page.locator('button:has-text("שרה")').first().click({ timeout: 1000 })
    step('set_owner_ok')
  } catch (e) { err('assignee_set', e) }

  // (Folder linking tested manually due to native picker) 

  // Add a comment and verify it persists after reopen
  try {
    const input = page.getByTestId('tm.comment.input')
    await input.fill('Probe comment 1')
    await page.getByTestId('tm.comment.create').click()
    // Expect a comment item to appear
    await page.getByTestId('tm.comment.item').first().waitFor({ timeout: 2000 })
    step('comment_post_ok')
    await page.getByTestId('tm.modal.close').click()
    await page.getByRole('button', { name: 'Open' }).first().click()
    await page.getByTestId('task-modal').waitFor({ timeout: 2000 })
    const hasComment = await page.getByTestId('tm.comment.item').first().isVisible().catch(() => false)
    step('comment_persist_check', { visible: hasComment })
  } catch (e) { err('comment_flow', e) }

  // Close modal
  try {
    await page.getByTestId('tm.modal.close').click()
    step('modal_closed')
  } catch (e) { err('close_modal', e) }

  await browser.close()
  out.logs = logs
  const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tasks_ui_probe_result.json')
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8')
  console.log(outPath)
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
