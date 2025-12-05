const STORAGE_KEY = 'eislaw.apiBase'

// Default API base for VM environment
const DEFAULT_API_BASE = 'http://20.217.86.4:8799'

function normalize(base) {
  return (base || '').replace(/\/$/, '')
}

export function getStoredApiBase() {
  if (typeof window === 'undefined') return DEFAULT_API_BASE
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return normalize(stored)

    // Auto-detect based on current host
    const currentHost = window.location.hostname
    if (currentHost === '20.217.86.4') {
      return 'http://20.217.86.4:8799'
    }
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return 'http://localhost:8799'
    }

    return DEFAULT_API_BASE
  } catch {
    return DEFAULT_API_BASE
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

  // Auto-detect: if we're on the VM (20.217.86.4), use VM API first
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : ''
  if (currentHost === '20.217.86.4') {
    push('http://20.217.86.4:8799')
  }

  // Preferred fixed ports first
  push('http://127.0.0.1:8080')
  push('http://localhost:8080')
  push('http://127.0.0.1:3000')
  push('http://localhost:3000')
  preferred.forEach(push)
  push(import.meta.env.VITE_API_URL)
  push(getStoredApiBase())
  push('http://127.0.0.1:8788')
  push('http://localhost:8788')
  push('http://127.0.0.1:8799')
  push('http://localhost:8799')
  // VM external IP (Azure dev)
  push('http://20.217.86.4:8799')
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
  return DEFAULT_API_BASE
}

export const API_BASE_STORAGE_KEY = STORAGE_KEY
