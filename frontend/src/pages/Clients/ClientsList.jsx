import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X, Loader2, FolderOpen } from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState('active')
  const [archivedCount, setArchivedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'')
  const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
  const HIDE_OUTLOOK = String(import.meta.env.VITE_HIDE_OUTLOOK||'').toLowerCase() === '1' || String(import.meta.env.VITE_HIDE_OUTLOOK||'').toLowerCase() === 'true'

  // Normalize client data from API (handle field name variations)
  const normalizeClient = (c) => {
    // Handle email/emails field - API may return either
    let emails = []
    if (Array.isArray(c.emails)) {
      emails = c.emails
    } else if (c.email) {
      emails = [c.email]
    }

    // Handle airtableId/airtable_id field
    const airtableId = c.airtable_id || c.airtableId || ''

    // Handle folder/folderPath field
    const folder = c.folder || c.folderPath || ''

    return {
      ...c,
      emails,
      airtable_id: airtableId,
      folder,
    }
  }

  const pickApiBase = async () => {
    const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
    if(MODE === 'LOCAL' && ENV_API){
      try{
        const r = await fetch(`${ENV_API}/api/clients?status=${statusFilter}`, { credentials:'omit' })
        if(r.ok){
          const j = await r.json()
          setRows(Array.isArray(j) ? j.map(normalizeClient) : [])
          setAPIBase(ENV_API)
          setStoredApiBase(ENV_API)
          // Fetch archived count
          try {
            const arcRes = await fetch(`${ENV_API}/api/clients?status=archived`, { credentials:'omit' })
            if (arcRes.ok) {
              const arcData = await arcRes.json()
              setArchivedCount(Array.isArray(arcData) ? arcData.length : 0)
            }
          } catch {}
          return ENV_API
        }
      }catch{}
    }
    const detected = await detectApiBase([ENV_API])
    if(detected){
      try{
        const r = await fetch(`${detected}/api/clients?status=${statusFilter}`, { credentials:'omit' })
        if(r.ok){
          const j = await r.json()
          setRows(Array.isArray(j) ? j.map(normalizeClient) : [])
          setAPIBase(detected)
          setStoredApiBase(detected)
          // Fetch archived count
          try {
            const arcRes = await fetch(`${detected}/api/clients?status=archived`, { credentials:'omit' })
            if (arcRes.ok) {
              const arcData = await arcRes.json()
              setArchivedCount(Array.isArray(arcData) ? arcData.length : 0)
            }
          } catch {}
          return detected
        }
      }catch{}
    }
    // fallback: keep rows as-is but signal missing base
    setAPIBase('')
    return ''
  }
  const load = async () => {
    setIsLoading(true)
    try {
      await pickApiBase()
    } finally {
      setIsLoading(false)
    }
    // rows set inside pickApiBase when a base responds
  }
  useEffect(() => { load() }, [statusFilter])
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
      // Search in emails (now properly normalized to array)
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
      const loc = await (await fetch(`${API}/api/client/locations?name=${encodeURIComponent(name)}`)).json()
      if(loc.sharepointUrl){
        window.open(loc.sharepointUrl, '_blank', 'noopener,noreferrer')
      } else {
        alert('לא נמצא קישור SharePoint ללקוח זה. יש להגדיר תחילה.')
      }
    }catch(err){
      console.error('openSharePoint error:', err)
      alert('שגיאה בפתיחת SharePoint')
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
          className="px-3 py-2 min-h-[44px] rounded bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive"
          onClick={() => setShowAdd(true)}
        >הוסף לקוח</button>
      </div>

      {/* Search box */}
      {(rows.length > 0 || archivedCount > 0) && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
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
          {/* Status filter dropdown */}
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>טוען...</span>
            </div>
          )}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            data-testid="status-filter"
            disabled={isLoading}
          >
            <option value="active">לקוחות פעילים</option>
            <option value="archived">ארכיון ({archivedCount})</option>
            <option value="all">הכל</option>
          </select>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card" data-testid="empty-state">
          <div className="text-slate-600 text-sm mb-3">לא נמצאו לקוחות.</div>
          <button
            data-testid="add-client-header"
            className="px-3 py-2 min-h-[44px] rounded bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive"
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
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-right text-slate-600">
                <th className="p-2">שם</th>
                <th className="p-2">אימייל</th>
                <th className="p-2">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(c => {
                // Now properly normalized - airtable_id and folder will be set correctly
                const hasAirtable = Boolean(c.airtable_id)
                const hasFolder = Boolean(c.folder)
                const emails = c.emails || []
                const emailCount = emails.length

                return (
                  <tr key={c.id} className={`border-b last:border-none hover:bg-slate-50 ${c.active === false ? 'opacity-60 bg-slate-50' : ''}`}>
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
                          {hasFolder && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200" title="SharePoint מקושר - לחץ SP לפתיחה">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              SP
                            </span>
                          )}
                          {!hasAirtable && !hasFolder && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200" title="לקוח ללא קישורים - יש להגדיר Airtable או SharePoint">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              להגדרה
                            </span>
                          )}
                          {c.active === false && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600" title="לקוח בארכיון">
                              בארכיון
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{emails.join(', ') || '-'}</span>
                        {emailCount > 1 && (
                          <span className="text-xs text-slate-400">+{emailCount - 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-petrol">
                      <div className="flex gap-2">
                        <Link className="underline" data-testid={`open-${encodeURIComponent(c.name)}`} to={`/clients/${encodeURIComponent(c.name)}`}>פתח</Link>
                        <button className="text-petrol underline" onClick={()=>navigate(`/clients/${encodeURIComponent(c.name)}?tab=emails`)}>אימיילים</button>
                        <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-petrol hover:bg-petrol/10 rounded" onClick={()=>openSharePoint(c.name)} title="פתח תיקיית SharePoint"><FolderOpen className="w-5 h-5" /></button>
                        {!HIDE_OUTLOOK && <button className="text-petrol underline" onClick={()=>openEmails(c.name)}>Outlook</button>}
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
