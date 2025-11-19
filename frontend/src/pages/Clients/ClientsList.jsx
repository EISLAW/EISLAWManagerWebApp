import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AddClientModal from '../../components/AddClientModal.jsx'
import { detectApiBase, getStoredApiBase, setStoredApiBase } from '../../utils/apiBase.js'

export default function ClientsList(){
  const navigate = useNavigate()
  const query = new URLSearchParams(window.location.search)
  const [rows, setRows] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [initialModalQuery, setInitialModalQuery] = useState('')
  const [APIBase, setAPIBase] = useState(() => getStoredApiBase())
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'')
  const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
  const HIDE_OUTLOOK = String(import.meta.env.VITE_HIDE_OUTLOOK||'').toLowerCase() === '1' || String(import.meta.env.VITE_HIDE_OUTLOOK||'').toLowerCase() === 'true'
  const pickApiBase = async () => {
    const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
    if(MODE === 'LOCAL' && ENV_API){
      try{
        const r = await fetch(`${ENV_API}/api/clients`, { credentials:'omit' })
        if(r.ok){
          const j = await r.json()
          setRows(Array.isArray(j)? j : [])
          setAPIBase(ENV_API)
          setStoredApiBase(ENV_API)
          return ENV_API
        }
      }catch{}
    }
    const detected = await detectApiBase([ENV_API])
    if(detected){
      try{
        const r = await fetch(`${detected}/api/clients`, { credentials:'omit' })
        if(r.ok){
          const j = await r.json()
          setRows(Array.isArray(j)? j : [])
          setAPIBase(detected)
          setStoredApiBase(detected)
          return detected
        }
      }catch{}
    }
    // fallback: keep rows as-is but signal missing base
    setAPIBase('')
    return ''
  }
  const load = async () => {
    await pickApiBase()
    // rows set inside pickApiBase when a base responds
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    const pre = (query.get('create')||'').trim()
    if(pre){
      setShowAdd(true)
      setInitialModalQuery(decodeURIComponent(pre))
    }
  }, [])

  // ——— Actions (parity with cloud) ———
  const owaRef = useRef(null)
  function openOwaWindow(url){
    const realm = 'eislaw.co.il'
    const warmUrl = `https://outlook.office.com/owa/?realm=${encodeURIComponent(realm)}&exsvurl=1`
    const features = 'noreferrer,resizable=yes,scrollbars=yes,status=no,width=1200,height=900'
    try{
      const w = window.open(url || warmUrl, 'EISLAW-OWA', features); owaRef.current = w; try { w && w.focus && w.focus() } catch {};
      if(!w){
        // Fallback: create anchor and click (new tab). Do NOT navigate the app tab.
        const a = document.createElement('a'); a.href = url || warmUrl; a.target = '_blank'; a.rel = 'noreferrer';
        document.body.appendChild(a); a.click(); a.remove();
      }
      return w
    }catch{ return null }
  }
  async function ensureSummary(name){
    const API = (APIBase || ENV_API || 'http://127.0.0.1:8788').replace(/\/$/,'')
    const r = await fetch(`${API}/api/client/summary?name=${encodeURIComponent(name)}&limit=10`)
    if(!r.ok) return null
    return await r.json()
  }

  function outlookMode(){
    try{ return localStorage.getItem('outlookOpenMode') || 'search' }catch{ return 'search' }
  }

  async function openEmails(name){
    const API = (APIBase || ENV_API || 'http://127.0.0.1:8788').replace(/\/$/,'')
    try{
      const j = await ensureSummary(name)
      const emails = Array.from(new Set([
        ...((j?.client?.emails)||[]).filter(Boolean),
        ...(((j?.client?.contacts)||[]).map(c=>c?.email).filter(Boolean))
      ]))
      if(outlookMode()==='latest'){
        // Try deep link for any address
        for(const a of emails){
          try{
            const r = await fetch(`${API}/api/outlook/latest_link?email=${encodeURIComponent(a)}`)
            if(r.ok){ const d = await r.json(); if(d.webLink){ const w = openOwaWindow(d.webLink); try { if(w) w.location = d.webLink } catch {}; return } }
          }catch{}
        }
      }
      // Fallback: OWA search across all addresses (or none -> noop)
      const realm='eislaw.co.il'
      if(emails.length){
        const query = emails.map(a=>`participants:${a}`).join(' OR ')
        const newOwa = `https://outlook.office.com/mail/search?q=${encodeURIComponent(query)}`
        const isLocalApi = API.startsWith('http://127.0.0.1') || API.startsWith('http://localhost')
        // Prefer local app-window (Edge) to avoid popup blockers and tab replacement
        if(isLocalApi){ try { const res = await fetch(`${API}/dev/open_outlook_app`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url: newOwa }) }); if(res.ok) return } catch {} }
        const w = openOwaWindow(newOwa); try { if(w) w.location = newOwa } catch {}
      }
    }catch{}
  }

  async function openFiles(name){
    const API = (APIBase || ENV_API || 'http://127.0.0.1:8788').replace(/\/$/,'')
    try{
      const loc = await (await fetch(`${API}/api/client/locations?name=${encodeURIComponent(name)}`)).json()
      const p = loc.localFolder
      // Prefer server-side open (no protocol prompts)
      try{ const res = await fetch(`${API}/dev/open_folder`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) }); if(res.ok){ alert('Opened in Explorer'); return } }catch{}
      // Fallbacks
      if(p){ try{ await navigator.clipboard?.writeText(p) }catch{}; alert('Copied folder path to clipboard'); }
    }catch{}
  }

  async function openSharePoint(name){
    const API = (APIBase || ENV_API || 'http://127.0.0.1:8788').replace(/\/$/,'')
    try{
      const loc = await (await fetch(`${API}/api/client/locations?name=${encodeURIComponent(name)}`)).json()
      if(loc.sharepointUrl){ window.open(loc.sharepointUrl, '_blank', 'noopener,noreferrer') }
    }catch{}
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading" data-testid="clients-title">Clients</h1>
        <div className="flex items-center gap-3">
          {MODE==='LOCAL' && <div className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Mode: LOCAL</div>}
          {APIBase && <div className="text-xs text-slate-500">API: {APIBase}</div>}
        </div>
        <button
          className="px-3 py-2 rounded bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive"
          onClick={() => setShowAdd(true)}
        >Add Client</button>
      </div>
      {rows.length === 0 ? (
        <div className="card" data-testid="empty-state">
          <div className="text-slate-600 text-sm mb-3">No clients found.</div>
          <button
            data-testid="add-client-header"
            className="px-3 py-2 rounded bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive"
            onClick={() => setShowAdd(true)}
          >Add Client</button>
        </div>
      ) : (
        <div className="card overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-right text-slate-600">
                <th className="p-2">Name</th>
                <th className="p-2">Emails</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className="border-b last:border-none">
                  <td className="p-2">
                    <Link className="underline text-petrol" data-testid={`open-${encodeURIComponent(c.name)}-name`} to={`/clients/${encodeURIComponent(c.name)}`}>{c.name}</Link>
                  </td>
                  <td className="p-2">{(c.emails||[]).join(', ')}</td>
                  <td className="p-2 text-petrol">
                    <div className="flex gap-2">
                      <Link className="underline" data-testid={`open-${encodeURIComponent(c.name)}`} to={`/clients/${encodeURIComponent(c.name)}`}>Open</Link>
                      <button className="text-petrol underline" onClick={()=>navigate(`/clients/${encodeURIComponent(c.name)}?tab=emails`)}>Emails (Indexed)</button>
                      <button className="text-petrol underline" onClick={()=>openFiles(c.name)}>Files</button>
                      <button className="text-petrol underline" onClick={()=>openSharePoint(c.name)}>SP</button>
                      {!HIDE_OUTLOOK && <button className="text-petrol underline" onClick={()=>openEmails(c.name)}>Emails</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddClientModal
          apiBase={APIBase}
          envApi={ENV_API}
          seedClients={rows}
          initialQuery={initialModalQuery}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
    </div>
  )
}
