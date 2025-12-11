export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function nowIso() {
  return new Date().toISOString()
}

export function hoursSince(iso) {
  if (!iso) return Infinity
  const then = new Date(iso).getTime()
  const now = Date.now()
  return (now - then) / (1000 * 60 * 60)
}

