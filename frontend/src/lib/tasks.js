import { lsGet, lsSet, nowIso, hoursSince } from './storage'

const KEY = 'eislaw.tasks.v1'
const KEY_ARCH = 'eislaw.taskArchive.v1'

export function allTasks() {
  return lsGet(KEY, [])
}

export function saveAll(tasks) {
  lsSet(KEY, tasks)
}

export function allArchived() {
  return lsGet(KEY_ARCH, [])
}

export function saveArchive(tasks) {
  lsSet(KEY_ARCH, tasks)
}

export function createTask(input) {
  const t = {
    id: crypto.randomUUID(),
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
  const items = allTasks()
  items.push(t)
  saveAll(items)
  return t
}

export function updateTask(id, patch) {
  const items = allTasks()
  const idx = items.findIndex(t => t.id === id)
  if (idx < 0) return null
  items[idx] = { ...items[idx], ...patch, updatedAt: nowIso() }
  saveAll(items)
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
