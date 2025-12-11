import { listTasks, createTask, createTaskAsync, updateTask, addSubtask, attach, setDone, allTasks } from '../../lib/tasks'
import { listOwners } from '../../lib/owners'

export function useOwners() {
  return listOwners()
}

export function getClientTasks(clientName) {
  const items = listTasks({ client: clientName, owner: 'all', delegatedOnly: false, timeWindowDays: 365 })
  const parents = items.filter(t => !t.parentId)
  const children = items.filter(t => !!t.parentId)
  const byParent = {}
  for (const st of children) {
    byParent[st.parentId] = byParent[st.parentId] || []
    byParent[st.parentId].push(st)
  }
  return { parents, byParent }
}

export function addClientTask(clientName, title) {
  return createTask({ title: title || 'New Task', clientName })
}

export async function addClientTaskAsync(clientName, title) {
  return createTaskAsync({ title: title || 'New Task', clientName })
}

export function setTaskDone(id, done) { return setDone(id, done) }

export function setTaskOwner(id, ownerId) {
  return updateTask(id, { ownerId })
}

export function updateTaskFields(id, patch) {
  return updateTask(id, patch)
}

export function addClientSubtask(parentId, title, clientName) {
  const parent = allTasks().find(t => t.id === parentId)
  const derivedClient = clientName ?? parent?.clientName ?? null
  return addSubtask(parentId, { title: title || 'Subtask', clientName: derivedClient })
}

export async function ensureTaskFolder(clientName, taskId) {
  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  try {
    const r = await fetch(`${API}/sp/task_folder_ensure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: clientName, task_id: taskId }) })
    if (r.ok) return await r.json()
  } catch {}
  return null
}

export async function uploadTaskFile(clientName, taskId, file) {
  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const fd = new FormData()
  fd.append('client_name', clientName)
  fd.append('task_id', taskId)
  fd.append('file', file, file.name)
  const r = await fetch(`${API}/sp/task_upload`, { method: 'POST', body: fd })
  if (!r.ok) throw new Error('upload failed')
  return await r.json()
}
