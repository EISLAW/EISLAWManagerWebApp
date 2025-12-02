import { lsGet, lsSet, nowIso } from './storage'

const KEY = 'eislaw.owners.v1'

export function listOwners() {
  return lsGet(KEY, [])
}

export function getOwner(id) {
  return listOwners().find(o => o.id === id) || null
}

export function upsertOwner(owner) {
  const items = listOwners()
  if (!owner.id) owner.id = crypto.randomUUID()
  owner.updatedAt = nowIso()
  const idx = items.findIndex(o => o.id === owner.id)
  if (idx >= 0) items[idx] = owner
  else items.push(owner)
  lsSet(KEY, items)
  return owner
}

export function removeOwner(id) {
  const items = listOwners().filter(o => o.id !== id)
  lsSet(KEY, items)
}

export async function currentUserEmail() {
  // Try backend auth; fallback to local setting
  try {
    const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    if (!API) return localStorage.getItem('eislaw.me.email') || ''
    const r = await fetch(`${API}/api/auth/me`)
    if (!r.ok) return localStorage.getItem('eislaw.me.email') || ''
    const j = await r.json()
    return j?.user?.email || (localStorage.getItem('eislaw.me.email') || '')
  } catch {
    return localStorage.getItem('eislaw.me.email') || ''
  }
}

