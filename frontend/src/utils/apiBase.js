const STORAGE_KEY = 'eislaw.apiBase'

function normalize(base) {
  return (base || '').replace(/\/$/, '')
}

export function getStoredApiBase() {
  if (typeof window === 'undefined') return ''
  try {
    return normalize(localStorage.getItem(STORAGE_KEY) || '')
  } catch {
    return ''
  }
}

export function setStoredApiBase(base) {
  if (typeof window === 'undefined') return
  try {
    if (base) {
      localStorage.setItem(STORAGE_KEY, normalize(base))
    }
  } catch {
    // ignore
  }
}

export async function detectApiBase(preferred = []) {
  const unique = []
  const push = (value) => {
    const norm = normalize(value)
    if (norm && !unique.includes(norm)) unique.push(norm)
  }
  preferred.forEach(push)
  push(import.meta.env.VITE_API_URL)
  push(getStoredApiBase())
  push('http://127.0.0.1:8788')
  push('http://localhost:8788')
  push('https://eislaw-api-01.azurewebsites.net')

  for (const base of unique) {
    try {
      const res = await fetch(`${base}/health`, { method: 'GET' })
      if (res.ok) {
        setStoredApiBase(base)
        return base
      }
    } catch {
      // try next
    }
  }
  return ''
}

export const API_BASE_STORAGE_KEY = STORAGE_KEY
