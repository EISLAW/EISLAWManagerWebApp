import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X, Mail, Folder, FileText } from 'lucide-react'
import AddClientModal from '../../components/AddClientModal.jsx'
import { detectApiBase, getStoredApiBase, setStoredApiBase } from '../../utils/apiBase.js'

export default function ClientsList(){
  const navigate = useNavigate()
  const query = new URLSearchParams(window.location.search)
  const [rows, setRows] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [initialModalQuery, setInitialModalQuery] = useState('')
  const [APIBase, setAPIBase] = useState(() => getStoredApiBase())
  const [searchQuery, setSearchQuery] = useState('')
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

  // ——— Search / Filter ———
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase().trim()
    return rows.filter(c => {
      // Search in name
      if ((c.name || '').toLowerCase().includes(q)) return true
      // Search in emails
      if ((c.emails || []).some(e => (e || '').toLowerCase().includes(q))) return true
      // Search in phone
      if ((c.phone || '').toLowerCase().includes(q)) return true
      return false
    })
  }, [rows, searchQuery])

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
      try{ const res = await fetch(`${API}/dev/open_folder`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) }); if(res.ok){ alert('נפתח בסייר'); return } }catch{}
      // Fallbacks
      if(p){ try{ await navigator.clipboard?.writeText(p) }catch{}; alert('נתיב התיקייה הועתק ללוח'); }
    }catch{}
  }

  async function openSharePoint(name){
    const API = (APIBase || ENV_API || 'http://127.0.0.1:8788').replace(/\/$/,'')
    try{
      // First try stored SharePoint URL from client data (must be actual URL, not local path)
      const client = rows.find(c => c.name === name)
      if(client?.sharepoint_url && client.sharepoint_url.startsWith('http')){
        window.open(client.sharepoint_url, '_blank', 'noopener,noreferrer')
        return
      }
      // Use client folder URL endpoint (more reliable)
      const resp = await fetch(`${API}/word/client_folder_url/${encodeURIComponent(name)}`)
      if(resp.ok){
        const data = await resp.json()
        if(data.exists && data.url){
          window.open(data.url, '_blank', 'noopener,noreferrer')
          return
        }
      }
      // No SharePoint folder found - show message
      alert('לא נמצאה תיקיית SharePoint ללקוח זה')
    }catch{
      alert('שגיאה בחיפוש תיקיית SharePoint')
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading" data-testid="clients-title">לקוחות</h1>
        <div className="flex items-center gap-3">
          {MODE==='LOCAL' && <div className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">מצב: LOCAL</div>}
          {APIBase && <div className="text-xs text-slate-500 hidden md:block">API: {APIBase}</div>}
        </div>
        <button
          className="px-3 py-2 rounded bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive"
          onClick={() => setShowAdd(true)}
        >הוסף לקוח</button>
      </div>

      {/* Search box */}
      {rows.length > 0 && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="חיפוש לקוח לפי שם, אימייל או טלפון..."
            className="w-full pr-10 pl-10 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            data-testid="client-search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card" data-testid="empty-state">
          <div className="text-slate-600 text-sm mb-3">לא נמצאו לקוחות.</div>
          <button
            data-testid="add-client-header"
            className="px-3 py-2 rounded bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive"
            onClick={() => setShowAdd(true)}
          >הוסף לקוח</button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="card" data-testid="no-results">
          <div className="text-slate-600 text-sm">אין תוצאות עבור "{searchQuery}"</div>
        </div>
      ) : (
        <div className="card overflow-auto">
          <div className="text-xs text-slate-500 mb-2 px-2">
            {searchQuery ? `נמצאו ${filteredRows.length} מתוך ${rows.length} לקוחות` : `${rows.length} לקוחות`}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-600">
                <th className="p-2 w-auto">שם</th>
                <th className="p-2 w-24 text-left">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(c => {
                // Support both camelCase (API) and snake_case field names
                const hasAirtable = Boolean(c.airtableId || c.airtable_id)
                // SharePoint: check URL field OR non-empty folderPath (OneDrive-synced SharePoint folders)
                const hasSharePoint = Boolean(c.sharepointUrl || c.sharepoint_url || c.folderPath)

                return (
                  <tr key={c.id} className="border-b last:border-none hover:bg-slate-50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Link className="underline text-petrol font-medium" data-testid={`open-${encodeURIComponent(c.name)}-name`} to={`/clients/${encodeURIComponent(c.name)}`}>{c.name}</Link>
                        <div className="flex items-center gap-1">
                          {hasAirtable && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="מקושר ל-Airtable">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              AT
                            </span>
                          )}
                          {hasSharePoint && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200" title="מקושר ל-SharePoint">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              SP
                            </span>
                          )}
                          {!hasAirtable && !hasSharePoint && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200" title="דורש הגדרה">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              חדש
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-petrol">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-petrol hover:text-petrol/70 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={()=>navigate(`/clients/${encodeURIComponent(c.name)}?tab=emails`)}
                          title="אימיילים"
                        >
                          <Mail size={18} />
                        </button>
                        <button
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-petrol hover:text-petrol/70 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={()=>openSharePoint(c.name)}
                          title="SharePoint"
                        >
                          <Folder size={18} />
                        </button>
                        <button
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-petrol hover:text-petrol/70 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={()=>navigate(`/clients/${encodeURIComponent(c.name)}?tab=documents`)}
                          title="יצירת מסמך"
                        >
                          <FileText size={18} />
                        </button>
                        {!HIDE_OUTLOOK && (
                          <button
                            className="p-2 min-h-[44px] flex items-center justify-center text-petrol hover:text-petrol/70 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                            onClick={()=>openEmails(c.name)}
                            title="Outlook"
                          >
                            Outlook
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
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
