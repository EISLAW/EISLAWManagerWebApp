import { lsGet, lsSet, nowIso, hoursSince } from './storage'
import { getStoredApiBase, detectApiBase } from '../utils/apiBase'

// UUID generator that works in non-secure contexts (HTTP)
function generateUUID() {
  // Use crypto.randomUUID if available (secure context)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts (HTTP on external IP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const KEY = 'eislaw.tasks.v1'
const KEY_ARCH = 'eislaw.taskArchive.v1'
const MIGRATION_KEY = 'eislaw.tasks.migrated'

// ─────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────

let cachedApiBase = null

async function getApiBase() {
  if (cachedApiBase) return cachedApiBase
  const stored = getStoredApiBase()
  if (stored) {
    cachedApiBase = stored
    return stored
  }
  const detected = await detectApiBase()
  if (detected) cachedApiBase = detected
  return cachedApiBase || ''
}

function getApiBaseSync() {
  if (cachedApiBase) return cachedApiBase
  const stored = getStoredApiBase()
  if (stored) {
    cachedApiBase = stored
    return stored
  }
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''
}

async function apiCall(method, path, body = null) {
  const base = await getApiBase()
  if (!base) throw new Error('No API base configured')

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${base}${path}`, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

// ─────────────────────────────────────────────────────────────
// Migration: localStorage → backend API
// ─────────────────────────────────────────────────────────────

let migrationAttempted = false

export async function migrateLocalStorageToBackend() {
  if (migrationAttempted) return
  migrationAttempted = true

  // Check if already migrated
  const migrated = lsGet(MIGRATION_KEY, false)
  if (migrated) return

  // Get tasks from localStorage
  const localTasks = lsGet(KEY, [])
  if (!localTasks.length) {
    // Nothing to migrate, mark as done
    lsSet(MIGRATION_KEY, true)
    return
  }

  try {
    // Import to backend
    await apiCall('POST', '/api/tasks/import', { tasks: localTasks, merge: true })
    // Mark as migrated
    lsSet(MIGRATION_KEY, true)
    console.log(`Migrated ${localTasks.length} tasks to backend`)
  } catch (err) {
    console.warn('Migration failed, will retry next time:', err)
  }
}

// ─────────────────────────────────────────────────────────────
// In-memory cache for tasks (reduces API calls)
// ─────────────────────────────────────────────────────────────

let tasksCache = null
let tasksCacheTime = 0
const CACHE_TTL = 5000 // 5 seconds

async function fetchTasksFromApi(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && tasksCache && (now - tasksCacheTime) < CACHE_TTL) {
    return tasksCache
  }

  try {
    const data = await apiCall('GET', '/api/tasks?include_done=true')
    tasksCache = data.tasks || []
    tasksCacheTime = now
    return tasksCache
  } catch (err) {
    console.warn('Failed to fetch tasks from API, using localStorage fallback:', err)
    // Fallback to localStorage
    return lsGet(KEY, [])
  }
}

function invalidateCache() {
  tasksCache = null
  tasksCacheTime = 0
}

// ─────────────────────────────────────────────────────────────
// Synchronous API (backward compatible - uses cache/localStorage)
// ─────────────────────────────────────────────────────────────

export function allTasks() {
  // Return from cache if available, otherwise localStorage
  if (tasksCache) return tasksCache
  return lsGet(KEY, [])
}

export function saveAll(tasks) {
  // Save to localStorage as backup
  lsSet(KEY, tasks)
  // Update cache
  tasksCache = tasks
  tasksCacheTime = Date.now()
}

export function allArchived() {
  return lsGet(KEY_ARCH, [])
}

export function saveArchive(tasks) {
  lsSet(KEY_ARCH, tasks)
}

// ─────────────────────────────────────────────────────────────
// Async API (uses backend)
// ─────────────────────────────────────────────────────────────

export async function fetchTasks(filters = {}) {
  await migrateLocalStorageToBackend()

  const params = new URLSearchParams()
  if (filters.client) params.set('client', filters.client)
  if (filters.owner) params.set('owner', filters.owner)
  if (filters.status) params.set('status', filters.status)
  if (filters.includeDone) params.set('include_done', 'true')

  const query = params.toString()
  const path = query ? `/api/tasks?${query}` : '/api/tasks?include_done=true'

  try {
    const data = await apiCall('GET', path)
    // Update cache
    if (!filters.client && !filters.owner && !filters.status) {
      tasksCache = data.tasks || []
      tasksCacheTime = Date.now()
    }
    return data.tasks || []
  } catch (err) {
    console.warn('fetchTasks failed:', err)
    return allTasks()
  }
}

export async function fetchTasksSummary() {
  await migrateLocalStorageToBackend()
  try {
    return await apiCall('GET', '/api/tasks/summary')
  } catch (err) {
    console.warn('fetchTasksSummary failed:', err)
    // Compute locally as fallback
    const tasks = allTasks().filter(t => t.status !== 'done' && !t.deletedAt)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const overdue = []
    const today = []
    const upcoming = []

    for (const t of tasks) {
      if (!t.dueAt) continue
      const due = new Date(t.dueAt)
      if (due < todayStart) overdue.push(t)
      else if (due < todayEnd) today.push(t)
      else if (due < weekEnd) upcoming.push(t)
    }

    return {
      overdue: overdue.length,
      overdueItems: overdue.slice(0, 10),
      today: today.length,
      todayItems: today.slice(0, 10),
      upcoming: upcoming.length,
      upcomingItems: upcoming.slice(0, 10),
      totalOpen: tasks.length,
    }
  }
}

// ─────────────────────────────────────────────────────────────
// CRUD operations (sync signature for compatibility, async internally)
// ─────────────────────────────────────────────────────────────

export function createTask(input) {
  const t = {
    id: generateUUID(),
    title: input.title?.trim() || 'New Task',
    desc: input.desc || '',
    status: 'new',
    dueAt: input.dueAt || null,
    priority: input.priority || null,
    clientName: input.clientName || null,
    clientFolderPath: input.clientFolderPath || null,
    ownerId: input.ownerId || null,
    parentId: input.parentId || null,
    comments: input.comments || [],
    attachments: input.attachments || [],
    templateRef: input.templateRef || null,
    source: input.source || 'manual',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    doneAt: null,
    deletedAt: null,
  }

  // Update local cache immediately for responsiveness
  const items = allTasks()
  items.push(t)
  saveAll(items)

  // Sync to backend async
  apiCall('POST', '/api/tasks', t)
    .then(() => invalidateCache())
    .catch(err => console.warn('createTask API sync failed:', err))

  return t
}

export function updateTask(id, patch) {
  const items = allTasks()
  const idx = items.findIndex(t => t.id === id)
  if (idx < 0) return null

  items[idx] = { ...items[idx], ...patch, updatedAt: nowIso() }
  saveAll(items)

  // Sync to backend async
  apiCall('PATCH', `/api/tasks/${id}`, patch)
    .then(() => invalidateCache())
    .catch(err => console.warn('updateTask API sync failed:', err))

  return items[idx]
}

export function addSubtask(parentId, input) {
  return createTask({ ...input, parentId })
}

export function attach(id, att) {
  const t = allTasks().find(x => x.id === id)
  if (!t) return null
  const a = { ...att }
  t.attachments = [...(t.attachments || []), a]
  t.updatedAt = nowIso()
  saveAll(allTasks().map(x => (x.id === id ? t : x)))

  // Sync to backend
  apiCall('PATCH', `/api/tasks/${id}`, { attachments: t.attachments })
    .then(() => invalidateCache())
    .catch(err => console.warn('attach API sync failed:', err))

  return a
}

export function markDone(id) {
  return updateTask(id, { status: 'done', doneAt: nowIso() })
}

export function setDone(id, done) {
  if (done) return markDone(id)
  return updateTask(id, { status: 'new', doneAt: null })
}

export function restoreTask(id) {
  // from archive to active
  const archive = allArchived()
  const idx = archive.findIndex(t => t.id === id)
  if (idx < 0) return null
  const t = archive[idx]
  archive.splice(idx, 1)
  saveArchive(archive)
  t.status = 'new'
  t.deletedAt = null
  t.doneAt = null
  t.updatedAt = nowIso()
  const items = allTasks()
  items.push(t)
  saveAll(items)

  // Sync to backend
  apiCall('PATCH', `/api/tasks/${id}`, { status: 'new', deletedAt: null, doneAt: null })
    .then(() => invalidateCache())
    .catch(err => console.warn('restoreTask API sync failed:', err))

  return t
}

export function archiveSweep() {
  // Move done tasks older than 24h to archive
  const items = allTasks()
  const keep = []
  const toArchive = []
  for (const t of items) {
    if (t.status === 'done' && hoursSince(t.doneAt) > 24) toArchive.push(t)
    else keep.push(t)
  }
  if (toArchive.length) {
    saveAll(keep)
    const cur = allArchived()
    saveArchive([...cur, ...toArchive.map(t => ({ ...t, deletedAt: nowIso() }))])
  }
}

export function listTasks({ client, owner, delegatedOnly, timeWindowDays, meEmail, owners }) {
  // owners is optional; used to resolve me vs others if needed
  let items = allTasks()
  if (client) items = items.filter(t => (t.clientName || '').toLowerCase() === client.toLowerCase())
  if (owner === 'me') {
    const meId = resolveOwnerIdByEmail(meEmail, owners)
    items = items.filter(t => (t.ownerId || '') === meId)
  } else if (owner && owner !== 'all' && owner !== 'delegated') {
    items = items.filter(t => t.ownerId === owner)
  }
  if (delegatedOnly) {
    const meId = resolveOwnerIdByEmail(meEmail, owners)
    items = items.filter(t => t.ownerId && t.ownerId !== meId)
  }
  // filter by time window (updatedAt)
  if (timeWindowDays && timeWindowDays > 0) {
    const cutoff = Date.now() - timeWindowDays * 24 * 60 * 60 * 1000
    items = items.filter(t => new Date(t.updatedAt).getTime() >= cutoff)
  }
  // exclude archived (already moved) and hard-deleted
  items = items.filter(t => !t.deletedAt)
  return items
}

export function topN(tasks, n = 5) {
  return [...tasks]
    .sort((a, b) => {
      // by due soonest, then recently updated
      const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
      const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
      if (ad !== bd) return ad - bd
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
    .slice(0, n)
}

export function groupByOwner(tasks) {
  const map = {}
  for (const t of tasks) {
    const key = t.ownerId || 'unassigned'
    map[key] = map[key] || []
    map[key].push(t)
  }
  return map
}

export function resolveOwnerIdByEmail(email, owners = []) {
  if (!email) return ''
  const hit = (owners || []).find(o => (o.email || '').toLowerCase() === email.toLowerCase())
  return hit ? hit.id : ''
}

// ─────────────────────────────────────────────────────────────
// Initialize: attempt migration on module load
// ─────────────────────────────────────────────────────────────

// Kick off migration in background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    migrateLocalStorageToBackend().catch(() => {})
  }, 1000)
}
