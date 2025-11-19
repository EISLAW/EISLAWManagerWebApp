// Helpers to open emails (Outlook web search or deep link) and files (Explorer/SP)

export async function pickApiBase() {
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
  const bases = []
  if (MODE === 'LOCAL' && ENV_API) bases.push(ENV_API)
  if (ENV_API) bases.push(ENV_API)
  bases.push('http://127.0.0.1:8788', 'http://localhost:8788', 'https://eislaw-api-01.azurewebsites.net')
  for (const b of bases) {
    try { const r = await fetch(`${b}/health`); if (r.ok) return b } catch {}
  }
  return ''
}

function openOwaWindow(url) {
  const realm = 'eislaw.co.il'
  const warmUrl = `https://outlook.office.com/owa/?realm=${encodeURIComponent(realm)}&exsvurl=1`
  const features = 'noreferrer,resizable=yes,scrollbars=yes,status=no,width=1200,height=900'
  try {
    const w = window.open(url || warmUrl, 'EISLAW-OWA', features)
    try { w && w.focus && w.focus() } catch {}
    if (!w) {
      const a = document.createElement('a'); a.href = url || warmUrl; a.target = '_blank'; a.rel = 'noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
    }
    return w
  } catch { return null }
}

export async function openEmailSearchForClient(clientName) {
  // Use indexed email page; OWA search is unreliable in your environment
  if (!clientName) return
  try { window.location.assign(`/clients/${encodeURIComponent(clientName)}?tab=emails`) } catch {}
}

export async function openClientFiles(clientName) {
  const API = await pickApiBase() || ''
  try {
    const enc = encodeURIComponent(clientName)
    const loc = await (await fetch(`${API}/api/client/locations?name=${enc}`)).json()
    const p = loc.localFolder || ''
    // Try desktop opener first (Explorer) when local API
    if (API.startsWith('http://127.0.0.1') || API.startsWith('http://localhost')) {
      try { const res = await fetch(`${API}/dev/open_folder`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: clientName }) }); if (res.ok) return } catch {}
    }
    // Fallbacks: open SharePoint if available
    if (loc.sharepointUrl) { try { window.open(loc.sharepointUrl, '_blank', 'noopener,noreferrer') } catch {} }
  } catch {}
}
