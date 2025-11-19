import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import Card from '../../../components/Card.jsx'
import KPI from '../../../components/KPI.jsx'
import StagePills from '../../../components/StagePills.jsx'
import TabNav from '../../../components/TabNav.jsx'
import TasksPanel from '../../../components/TasksPanel.jsx'
import TaskBoard from '../../../features/tasksNew/TaskBoard.jsx'
import AddClientModal from '../../../components/AddClientModal.jsx'
import LinkAirtableModal from '../../../components/LinkAirtableModal.jsx'
import { addClientTask, updateTaskFields } from '../../../features/tasksNew/TaskAdapter.js'
import { Loader2, RefreshCcw, Paperclip } from 'lucide-react'
import { detectApiBase, getStoredApiBase, setStoredApiBase } from '../../../utils/apiBase.js'

// Simple in-memory cache for client summaries during the session to avoid re-fetch on tab switches
const summaryCache = new Map()
export default function ClientOverview(){
  const { name } = useParams()
  const decodedName = useMemo(() => decodeURIComponent(name), [name])
  const encodedName = useMemo(() => encodeURIComponent(decodedName), [decodedName])
  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const tab = params.get('tab') || 'overview'
  const base = `/clients/${encodedName}`
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'')
  const [apiBase, setApiBase] = useState(() => getStoredApiBase() || ENV_API || 'https://eislaw-api-01.azurewebsites.net')
  const API = useMemo(() => (apiBase || ENV_API || 'https://eislaw-api-01.azurewebsites.net').replace(/\/$/,''), [apiBase, ENV_API])
  const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
  const HIDE_OUTLOOK = String(import.meta.env.VITE_HIDE_OUTLOOK||'').toLowerCase() === '1' || String(import.meta.env.VITE_HIDE_OUTLOOK||'').toLowerCase() === 'true'

  const [summary, setSummary] = useState({ client:{ name: decodedName }, files:[], emails:[] })
  const [online, setOnline] = useState({ emails:[], loading:false })
  const [emailRefreshKey, setEmailRefreshKey] = useState(0)
  const [syncingEmails, setSyncingEmails] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const [syncResult, setSyncResult] = useState(null)
  const [spBusy, setSpBusy] = useState(false)
  const [locations, setLocations] = useState(null)
  const [edit, setEdit] = useState(false)
  const [editForm, setEditForm] = useState({ email: '', phone: '' })
  const owaRef = useRef(null)
  const [showWord, setShowWord] = useState(false)
  const [wordList, setWordList] = useState([])
  const [wordStatus, setWordStatus] = useState('')
  const TEMPLATE_DIR = import.meta.env.VITE_TEMPLATES_PATH || 'C:\\\\Users\\\\USER\\\\Eitan Shamir & Co\\\\EISLAW TEAM - מסמכים\\\\לקוחות משרד\\\\לקוחות משרד_טמפלייטים'
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role_desc: '', address: '', id_number: '' })
  const [idx, setIdx] = useState({ items: [], total: 0, loading: false, mode: '' })
  const [emailFilters, setEmailFilters] = useState({ query:'', sender:'', receiver:'', dateFrom:'', dateTo:'', attachments:'any' })
  const [viewer, setViewer] = useState({ open: false, loading: false, error: '', html: '', meta: {} })
  const [sel, setSel] = useState(null)
  const [clientCardOpen, setClientCardOpen] = useState(false)
  const [clientModalKey, setClientModalKey] = useState(0)
  const [syncingClientCard, setSyncingClientCard] = useState(false)
  const [airtableLinkModal, setAirtableLinkModal] = useState({ open: false, afterSync: false })
  const [creatingTaskId, setCreatingTaskId] = useState(null)
  const pendingSyncAfterLinkRef = useRef(false)
  const sharepointLinked = Boolean(summary.client?.folder)
  const airtableLinked = Boolean(summary.client?.airtable_id)
  const [emailSinceDays, setEmailSinceDays] = useState(90)

  // Load summary before hooks that depend on it to avoid TDZ errors
  const loadSummary = useCallback(async (opts = {}) => {
    const key = encodedName
    const useCache = opts.useCache !== false
    if(useCache && summaryCache.has(key)){
      const cached = summaryCache.get(key)
      setSummary(cached)
      setEditForm({ email: (cached.client?.emails||[])[0] || '', phone: cached.client?.phone||'' })
    }
    try{
      const r = await fetch(`${API}/api/client/summary?name=${encodedName}&limit=10`)
      if(!r.ok) return null
      const j = await r.json()
      summaryCache.set(key, j)
      setSummary(j)
      setEditForm({ email: (j.client?.emails||[])[0] || '', phone: j.client?.phone||'' })
      return j
    }catch{
      return summaryCache.get(key) || null
    }
  }, [API, encodedName])

  const openLinkModal = useCallback((afterSync = false) => {
    pendingSyncAfterLinkRef.current = afterSync
    setAirtableLinkModal({ open: true, afterSync })
  }, [])
  const handleLinkModalClose = useCallback(() => {
    pendingSyncAfterLinkRef.current = false
    setAirtableLinkModal({ open: false, afterSync: false })
  }, [])
  const handleLinkCompleted = useCallback(
    async (linkedRecord) => {
      const refreshed = await loadSummary()
      setAirtableLinkModal({ open: false, afterSync: false })
      // Optimistically reflect linked Airtable ID if refresh didn't populate it yet
      if (!refreshed?.client?.airtable_id && linkedRecord?.id) {
        setSummary((prev) => ({
          ...prev,
          client: {
            ...(prev.client || {}),
            airtable_id: linkedRecord.id,
            airtable_url: linkedRecord.airtable_url || (prev.client?.airtable_url || ''),
          },
        }))
      }
      const shouldSync = pendingSyncAfterLinkRef.current
      pendingSyncAfterLinkRef.current = false
      if (shouldSync && ((refreshed && refreshed.client) || summary.client)) {
        await syncClientCard((refreshed && refreshed.client) || summary.client)
      }
    },
    [loadSummary, summary.client, syncClientCard]
  )

  useEffect(() => {
    if(apiBase && apiBase !== getStoredApiBase()){
      setStoredApiBase(apiBase)
    }
    if(!apiBase || apiBase === 'https://eislaw-api-01.azurewebsites.net'){
      (async()=>{
        const detected = await detectApiBase([apiBase, ENV_API])
        if(detected) setApiBase(detected)
      })()
    }
  }, [apiBase, ENV_API])

  useEffect(() => { loadSummary({ useCache:true }) }, [loadSummary])

  useEffect(() => {
    if(tab === 'emails'){
      (async()=>{
        try{
          setIdx(s=>({ ...s, loading: true }))
          const r = await fetch(`${API}/email/by_client?name=${encodedName}&limit=25&offset=0`)
          if(r.ok){
            const j = await r.json();
            // If primary path yields 0 (e.g., client not linked), attempt a search by email as a UI-side fallback
            if((j.total||0) === 0){
              const emails = Array.from(new Set([ ...(summary.client?.emails||[]).filter(Boolean), ...(((summary.client?.contacts)||[]).map(c=>c?.email).filter(Boolean)) ]))
              if(emails.length){
                const q = encodeURIComponent(emails[0])
                try{
                  const r2 = await fetch(`${API}/email/search?q=${q}&limit=25&offset=0`)
                  if(r2.ok){ const j2 = await r2.json(); setIdx({ items: j2.items||[], total: j2.total||0, loading: false, mode: 'search' }); return }
                }catch{}
              }
            }
            setIdx({ items: j.items||[], total: j.total||0, loading: false, mode: (j.mode||'client') })
          } else {
            setIdx({ items: [], total: 0, loading: false, mode: '' })
          }
        }catch{ setIdx({ items: [], total: 0, loading: false, mode: '' }) }
      })()
    }
  }, [tab, encodedName, summary, API, emailRefreshKey])

  const primaryEmail = useMemo(() => (summary.client?.emails||[])[0] || '', [summary])
  const phoneDigits = useMemo(() => (summary.client?.phone||'').replace(/\D/g,''), [summary])
  const filteredIdxItems = useMemo(() => {
    const q = (emailFilters.query || '').toLowerCase().trim()
    const sender = (emailFilters.sender || '').toLowerCase().trim()
    const receiver = (emailFilters.receiver || '').toLowerCase().trim()
    const hasAttach = emailFilters.attachments
    const fromTs = emailFilters.dateFrom ? Date.parse(emailFilters.dateFrom) : null
    const toTs = emailFilters.dateTo ? Date.parse(emailFilters.dateTo) + (24*60*60*1000 - 1) : null
    return (idx.items || []).filter(it => {
      const derivedAttachments = Boolean(it?.has_attachments || Number(it?.attachments_count||0) > 0)
      const receivedTs = it.received ? Date.parse(it.received) : null
      if(fromTs && (receivedTs === null || receivedTs < fromTs)) return false
      if(toTs && (receivedTs === null || receivedTs > toTs)) return false
      if(q){
        const hay = `${it.subject||''} ${it.preview||''} ${it.from||''} ${it.to||''} ${it.cc||''}`.toLowerCase()
        if(!hay.includes(q)) return false
      }
      if(sender && !String(it.from||'').toLowerCase().includes(sender)) return false
      const allRecipients = `${it.to||''} ${it.cc||''}`.toLowerCase()
      if(receiver && !allRecipients.includes(receiver)) return false
      if(hasAttach === 'yes' && !derivedAttachments) return false
      if(hasAttach === 'no' && derivedAttachments) return false
      return true
    })
  }, [idx.items, emailFilters])
  const lastSyncLabel = useMemo(() => {
    if(!syncResult?.at) return ''
    try{
      return new Date(syncResult.at).toLocaleString('he-IL', { dateStyle:'short', timeStyle:'short' })
    }catch{
      return ''
    }
  }, [syncResult])
  const isRtl = useCallback((txt='') => /[\u0590-\u05FF]/.test(txt), [])
  const syncParticipantsMeta = useMemo(() => {
    if(!Array.isArray(syncResult?.participants)) return { items: [], extra: 0 }
    const filtered = syncResult.participants.filter(Boolean)
    return {
      items: filtered.slice(0, 4),
      extra: Math.max(0, filtered.length - 4)
    }
  }, [syncResult])

  const modalClient = useMemo(() => {
    const base = summary?.client || {}
    if(!base || Object.keys(base).length === 0) return null
    const emails = Array.isArray(base.emails)
      ? base.emails
      : base.email
      ? [base.email]
      : []
    const clientType = Array.isArray(base.client_type)
      ? base.client_type
      : base.client_type
      ? [base.client_type].flat().filter(Boolean)
      : []
    return {
      ...base,
      name: base.display_name || base.name || decodedName,
      display_name: base.display_name || base.name || decodedName,
      emails,
      phone: base.phone || '',
      notes: base.notes || base.description || '',
      status: base.stage || base.status || '',
      client_type: clientType,
      contacts: Array.isArray(base.contacts) ? base.contacts : [],
      airtable_id: base.airtable_id || base.id || '',
      airtable_url: base.airtable_url || base.airtableUrl || '',
      folder: base.folder || '',
    }
  }, [summary, decodedName])

  const openClientCardModal = () => {
    if(!modalClient){
      alert('Client summary not ready yet. Please try again shortly.')
      return
    }
    setClientModalKey(v => v + 1)
    setClientCardOpen(true)
  }

  const closeClientCardModal = () => setClientCardOpen(false)

  const handleClientModalSaved = async () => {
    await loadSummary()
    setEmailRefreshKey(v => v + 1)
  }

  async function syncClientCard(clientData){
    if(!clientData){
      alert('Client summary not ready yet.')
      return
    }
    if(!clientData.airtable_id){
      openLinkModal(true)
      return
    }
    const emails = Array.isArray(clientData.emails) ? clientData.emails : []
    if(!emails.length){
      alert('Client is missing an email address. Please add one first.')
      return
    }
    setSyncingClientCard(true)
    const payloadBase = { method:'POST', headers:{'Content-Type':'application/json'} }
    try{
      await fetch(`${API}/airtable/clients_upsert`, {
        ...payloadBase,
        body: JSON.stringify({
          name: clientData.name || decodedName,
          email: emails[0],
          airtable_id: clientData.airtable_id || clientData.id,
          phone: clientData.phone || undefined,
        })
      })
      const registryPayload = {
        display_name: clientData.display_name || clientData.name || decodedName,
        email: emails,
        phone: clientData.phone || '',
        client_type: Array.isArray(clientData.client_type) ? clientData.client_type : [],
        stage: clientData.stage || clientData.status || '',
        notes: clientData.notes || '',
        contacts: Array.isArray(clientData.contacts) ? clientData.contacts : [],
        airtable_id: clientData.airtable_id || clientData.id || '',
        airtable_url: clientData.airtable_url || clientData.airtableUrl || '',
      }
      if(clientData.folder){
        registryPayload.folder = clientData.folder
      }
      await fetch(`${API}/registry/clients`, {
        ...payloadBase,
        body: JSON.stringify(registryPayload)
      })
      await loadSummary()
      alert('Client synced successfully.')
    }catch(err){
      console.error('syncClientCard', err)
      alert('Failed to sync client. Check console for details.')
    }finally{
      setSyncingClientCard(false)
    }
  }

  const attachIndicator = (item) => {
    const count = Number(item?.attachments_count || 0)
    const hasAtt = Boolean(item?.has_attachments || count > 0)
    if(!hasAtt) return <span className="inline-block w-4" aria-hidden="true" />
    const label = count > 0 ? `${count} attachments` : 'Attachments included'
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
        title={label}
        aria-label={label}
      >
        <Paperclip className="w-3 h-3" aria-hidden="true" />
        {count > 0 && <span>{count}</span>}
      </span>
    )
  }

  function gotoIndexedEmails(){
    try{
      window.location.assign(`/clients/${encodedName}?tab=emails`)
    }catch{}
  }

  function outlookMode(){
    try{ return localStorage.getItem('outlookOpenMode') || 'search' }catch{ return 'search' }
  }

  function openOwaWindow(url){
    const realm = 'eislaw.co.il'
    const warmUrl = `https://outlook.office.com/owa/?realm=${encodeURIComponent(realm)}&exsvurl=1`
    const features = 'noreferrer,resizable=yes,scrollbars=yes,status=no,width=1200,height=900'
    try{
      const w = window.open(url || warmUrl, 'EISLAW-OWA', features)
      owaRef.current = w
      try { w && w.focus && w.focus() } catch {}
      if(!w){
        const a = document.createElement('a'); a.href = url || warmUrl; a.target = '_blank'; a.rel = 'noreferrer';
        document.body.appendChild(a); a.click(); a.remove();
      }
      return w
    }catch{ return null }
  }

  async function openOutlookFor(email){
    if(HIDE_OUTLOOK) return
    if(!email) return
    // Compose a new message to the selected email
    const mailto = `mailto:${encodeURIComponent(email)}`
    try{
      // prefer same-tab navigation to mailto to avoid extra blank tabs
      const a = document.createElement('a'); a.href = mailto; a.rel = 'noreferrer';
      a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
    }catch{}
  }

  function openOutlookSearch(email, months=2){
    if(HIDE_OUTLOOK) return
    // Build AQS for last X months
    const d = new Date();
    d.setMonth(d.getMonth() - months)
    const since = d.toISOString().slice(0,10)
    const realm = 'eislaw.co.il'
    const query = encodeURIComponent(`participants:${email} AND received>=${since}`)
    const owa = `https://outlook.office.com/owa/?realm=${encodeURIComponent(realm)}&exsvurl=1&path=/mail/search&query=${query}`
    const w = openOwaWindow(owa); try { if(w) w.location = owa } catch {}
  }

  function getAllAddresses(){
    const clientEmails = (summary.client?.emails||[]).filter(Boolean)
    const contactEmails = ((summary.client?.contacts)||[]).map(c => c?.email).filter(Boolean)
    const seen = new Set(); const all = []
    for(const e of [...clientEmails, ...contactEmails]){ if(!seen.has(e)){ seen.add(e); all.push(e) } }
    return all
  }

  async function openLocalPath(path){
    if(!path) return
    try{
      const res = await fetch(`${API}/dev/desktop/open_path`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path }) })
      if(!res.ok){
        const txt = await res.text()
        throw new Error(txt || res.statusText)
      }
      return true
    }catch(err){
      setWordStatus(prev => prev || `Unable to open path: ${err?.message||err}`)
      return false
    }
  }

  async function pickFolderDialog(){
    try{
      const res = await fetch(`${API}/dev/desktop/pick_folder`, { method:'POST' })
      if(!res.ok) return false
      const j = await res.json()
      if(j?.path){
        await openLocalPath(j.path)
        return true
      }
    }catch{}
    return false
  }

  async function openClientFolder(){
    try{
      await fetch(`${API}/dev/open_folder`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: decodedName }) })
    }catch{}
  }

  async function openFolderKpi(){
    const isLocalApi = API.startsWith('http://127.0.0.1') || API.startsWith('http://localhost')
    // Try local folder first
    if(isLocalApi){
      try{
        const res = await fetch(`${API}/dev/open_folder`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: decodedName }) })
        if(res.ok) return
      }catch{}
    }
    // Fallback to SharePoint link
    try{
      const resp = await fetch(`${API}/client/sharepoint_link?name=${encodeURIComponent(decodedName)}`)
      if(resp.ok){
        const j = await resp.json()
        if(j.webUrl){ window.open(j.webUrl, '_blank', 'noopener,noreferrer'); return }
      }
    }catch{}
    // As last resort, try local folder path if present
    if(summary.client?.folder){ await openLocalPath(summary.client.folder) }
  }

  async function openEmailsAll(){
    const addrs = getAllAddresses()
    const toList = addrs.length ? addrs : (primaryEmail ? [primaryEmail] : [])
    if(!toList.length) return
    // Compose a single message addressed to all collected emails
    const mailto = `mailto:${encodeURIComponent(toList.join(','))}`
    try{
      const a = document.createElement('a'); a.href = mailto; a.rel = 'noreferrer';
      a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove()
    }catch{}
  }

  async function ensureLocations(){
    if(locations) return locations
    const r = await fetch(`${API}/api/client/locations?name=${encodedName}`)
    if(r.ok){
      const data = await r.json(); setLocations(data); return data
    }
    return { localFolder: summary.client?.folder||'', sharepointUrl: '' }
  }

  async function openExplorerPath(){
    const loc = await ensureLocations()
    const p = loc.localFolder || summary.client?.folder
    const isLocalApi = API.startsWith('http://127.0.0.1') || API.startsWith('http://localhost')
    // Prefer server-side Explorer open first (prevents protocol prompts)
    if(isLocalApi){
      try{ const res = await fetch(`${API}/dev/open_folder?name=${encodedName}`, { method:'POST' }); if(res.ok) return }catch{}
    }
    // Fallbacks
    if(loc.sharepointUrl){ window.open(loc.sharepointUrl, '_blank', 'noopener,noreferrer'); return }
    if(p){ navigator.clipboard?.writeText(p); alert(`Folder path copied to clipboard:\n${p}`); return }
    alert('No folder mapping available yet')
  }

  async function openSharePoint(){
    try{
      setSpBusy(true)
      const loc = await ensureLocations()
      if(loc.sharepointUrl){ window.open(loc.sharepointUrl, '_blank', 'noopener,noreferrer') }
      else { throw new Error('not found') }
    }catch(err){
      alert('Could not resolve SharePoint folder. We can configure mapping if needed.')
    }finally{
      setSpBusy(false)
    }
  }

  async function fetchOnlinePreview(){
    setOnline(s => ({...s, loading:true}))
    try{
      const r = await fetch(`${API}/api/client/summary_online?name=${encodedName}&limit=25`)
      if(r.ok){
        const data = await r.json()
        setOnline({ emails: data.emails||[], loading:false })
        return
      }
    }catch{}
    setOnline(s => ({...s, loading:false}))
  }

  async function syncEmails(){
    if(syncingEmails) return
    const windowDays = Math.max(30, Math.min(365, Number(emailSinceDays)||90))
    setSyncingEmails(true)
    setSyncStatus('מושך מיילים...')
    fetchOnlinePreview()
    try{
      const r = await fetch(`${API}/email/sync_client`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: decodedName, since_days: windowDays })
      })
      if(!r.ok){
        const msg = await r.text()
        throw new Error(msg || 'sync failed')
      }
      const data = await r.json()
      const summary = data?.summary || {}
      const insertedRaw = summary?.inserted_or_updated ?? summary?.updated ?? summary?.inserted ?? summary?.count ?? null
      const inserted = Number.isFinite(Number(insertedRaw)) ? Number(insertedRaw) : null
      setSyncResult({
        inserted,
        participants: Array.isArray(data?.participants) ? data.participants.filter(Boolean) : [],
        sinceDays: data?.since_days || 45,
        at: new Date().toISOString()
      })
      setSyncStatus(inserted !== null ? `הועלו ${inserted} אימיילים` : 'סנכרון הושלם')
      await loadSummary()
      setEmailRefreshKey(v => v + 1)
    }catch(err){
      console.error('syncEmails', err)
      setSyncStatus('הסנכרון נכשל')
      alert('Email sync failed. See console for details.')
    }finally{
      setSyncingEmails(false)
      setTimeout(() => setSyncStatus(''), 6000)
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="heading">{decodedName}</h1>
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2">
            <button data-testid="edit-client" onClick={()=>setEdit(v=>!v)} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-petrol shadow-sm hover:bg-petrol hover:text-white transition">{edit? 'Close Edit' : 'Edit'}</button>
            <button
              data-testid="open-client-card"
              onClick={openClientCardModal}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-petrol shadow-sm hover:bg-petrol hover:text-white transition"
            >
              Client Card
            </button>
            <button
              data-testid="airtable-sync"
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-petrol shadow-sm hover:bg-petrol hover:text-white transition disabled:opacity-50"
                disabled={syncingClientCard || !modalClient}
                onClick={() => {
                  if (!modalClient?.airtable_id) {
                    openLinkModal(true)
                    return
                  }
                  syncClientCard(modalClient)
                }}
              >
                {syncingClientCard ? 'Syncing…' : 'Sync Airtable'}
            </button>
            <button
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-petrol shadow-sm hover:bg-petrol hover:text-white transition"
              onClick={()=>window.location.assign(`/clients/${encodedName}?tab=tasks`)}
            >
              View Tasks
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
            {(!HIDE_OUTLOOK && primaryEmail) && (
              <button data-testid="open-emails" className="rounded-full bg-petrol px-3 py-1 text-xs font-semibold text-white hover:bg-petrolHover" onClick={()=>openOutlookFor(primaryEmail)}>
                Open Emails
              </button>
            )}
            {!HIDE_OUTLOOK && primaryEmail && (
              <a data-testid="send-email" className="rounded-full bg-petrol/80 px-3 py-1 text-xs font-semibold text-white" href={`mailto:${primaryEmail}`} target="_blank" rel="noreferrer">
                Send Email
              </a>
            )}
            {phoneDigits && (
              <a data-testid="open-whatsapp" className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
          </div>
          <div className="inline-flex flex-wrap items-center gap-2">
            {airtableLinked ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Airtable: Linked
              </span>
            ) : (
              <button
                type="button"
                className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                onClick={() => openLinkModal(false)}
              >
                Airtable: Missing (Link)
              </button>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sharepointLinked ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              SharePoint: {sharepointLinked ? 'Folder linked' : 'Not linked'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <TabNav base={base} current={tab} tabs={[
          {key:'overview', label:'Overview'},
          {key:'files', label:'Files'},
          {key:'emails', label:'Emails'},
          {key:'tasks', label:'Tasks'},
          {key:'rag', label:'RAG'},
          {key:'privacy', label:'Privacy (soon)'}
        ]}/>
      </div>

            {tab==='overview' && (
        <div className="grid gap-6 md:grid-cols-[2fr,minmax(260px,1fr)]">
          <div className="space-y-6">
            {edit && (
              <Card title="Edit Client">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="text-sm">Email<input value={editForm.email} onChange={e=>setEditForm({...editForm, email:e.target.value})} className="mt-1 w-full border rounded px-2 py-1"/></label>
                  <label className="text-sm">Phone<input value={editForm.phone} onChange={e=>setEditForm({...editForm, phone:e.target.value})} className="mt-1 w-full border rounded px-2 py-1"/></label>
                </div>
                <div className="mt-3">
                  <button data-testid="save-client" className="px-3 py-1 rounded bg-success text-white" onClick={async ()=>{
                    const nm = decodedName
                    const email = editForm.email.trim(); const phone = editForm.phone.trim()
                    try{
                      await fetch(`${API}/registry/clients`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ display_name: nm, email: email? [email]: [], phone }) })
                      if(email){ await fetch(`${API}/airtable/clients_upsert`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: nm, email }) }) }
                      alert('Saved')
                      const encoded = encodeURIComponent(nm)
                      const r = await fetch(`${API}/api/client/summary?name=${encoded}&limit=10`)
                      if(r.ok){ setSummary(await r.json()) }
                      setEdit(false)
                    }catch(e){ alert('Save failed') }
                  }}>Save</button>
                </div>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPI testId="kpi-primary-email" label="Primary Email" value={primaryEmail || '-'} href={primaryEmail ? `mailto:${primaryEmail}` : undefined} />
              <KPI testId="kpi-folder" label="Folder" value={summary.client?.folder ? 'Available' : '-'} onClick={summary.client?.folder ? ()=>openFolderKpi() : undefined} />
              <KPI testId="kpi-files" label="Files" value={summary.files?.length || 0} />
              <KPI testId="kpi-recent-emails" label="Recent Emails" value={(summary.emails?.length || 0) + (online.emails?.length || 0)} onClick={gotoIndexedEmails} />
            </div>
            <Card title="SFU">
              <StagePills phase={'analysis'} />
            </Card>
            <Card title="Email Shortcuts">
              <div className="text-sm text-slate-700 mb-2">Open Outlook for any address or all at once.</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {(summary.client?.emails||[]).map(e => (
                  <button key={e} className="px-2 py-1 rounded bg-petrol/10 text-petrol" onClick={()=>openOutlookFor(e)}>{e}</button>
                ))}
                {((summary.client?.contacts)||[]).filter(c=>c?.email).map(c => (
                  <button key={c.email} className="px-2 py-1 rounded bg-petrol/10 text-petrol" onClick={()=>openOutlookFor(c.email)}>{c.name? `${c.name} <${c.email}>` : c.email}</button>
                ))}
                <button className="px-2 py-1 rounded bg-petrol text-white" onClick={openEmailsAll}>Open All</button>
              </div>
            </Card>
          </div>
          <aside className="space-y-4">
            <Card title="Word Templates">
              {!showWord && (
                <button
                  data-testid="word-templates"
                  onClick={async()=>{
                    setWordStatus('')
                    // Try interactive folder picker first
                    const picked = await pickFolderDialog()
                    if(picked) return
                    // Fallback: open templates folder directly
                    const opened = await openLocalPath(TEMPLATE_DIR)
                    if(opened) return
                    // fallback to in-app list if explorer open fails
                    setShowWord(true)
                    try{
                      const r = await fetch(`${API}/word/templates`)
                      const j = await r.json()
                      setWordList(j.templates||[])
                    }catch{
                      setWordList([])
                      setWordStatus('Unable to load templates list')
                    }
                  }}
                  className="px-3 py-1 rounded bg-petrol/80 text-white"
                >Browse templates…</button>
              )}
              {showWord && (
                <>
                  <div className="text-sm text-slate-600 mb-2">Choose a template to generate a DOCX in the client folder.</div>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-auto">
                    {wordList.map(t => (
                      <button key={t.path} className="text-left px-3 py-2 rounded border hover:bg-cardGrey" onClick={async()=>{
                        setWordStatus('Generating…')
                        try{
                          const r = await fetch(`${API}/word/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ client_name: decodedName, template_path: t.path }) })
                          if(r.ok){
                            const j = await r.json()
                            const statusMsg = 'Created: ' + ((j.webUrl && 'SharePoint') || j.path || '')
                            setWordStatus(statusMsg)
                            if(j.path){
                              await openLocalPath(j.path)
                              await openClientFolder()
                            }
                            if(j.webUrl){ try{ window.open(j.webUrl, '_blank', 'noopener,noreferrer') }catch{} }
                          } else {
                            const txt = await r.text()
                            setWordStatus('Failed to generate: ' + (txt || r.statusText))
                          }
                        }catch(err){ setWordStatus('Failed to generate: ' + (err?.message||err)) }
                      }}>{t.name}</button>
                    ))}
                    {wordList.length===0 && <div className="text-sm text-slate-500">No templates found</div>}
                  </div>
                  <div className="mt-2 text-sm">{wordStatus}</div>
                  <div className="mt-2 flex justify-between">
                    <button className="px-3 py-1 rounded bg-slate-300" onClick={()=>setShowWord(false)}>Close</button>
                  </div>
                </>
              )}
            </Card>
            <Card title="Add Contact">
              <div className="text-sm text-slate-700 mb-2">Add additional contacts linked to this client.</div>
              <div className="grid grid-cols-1 gap-2">
                <input data-testid="add-contact-name" placeholder="Name" value={newContact.name} onChange={e=>setNewContact({...newContact, name:e.target.value})} className="border rounded px-2 py-1"/>
                <input data-testid="add-contact-email" placeholder="Email" value={newContact.email} onChange={e=>setNewContact({...newContact, email:e.target.value})} className="border rounded px-2 py-1"/>
                <input data-testid="add-contact-phone" placeholder="Phone" value={newContact.phone} onChange={e=>setNewContact({...newContact, phone:e.target.value})} className="border rounded px-2 py-1"/>
                <input data-testid="add-contact-role-desc" placeholder="Role Description" value={newContact.role_desc} onChange={e=>setNewContact({...newContact, role_desc:e.target.value})} className="border rounded px-2 py-1"/>
                <input data-testid="add-contact-address" placeholder="Address" value={newContact.address} onChange={e=>setNewContact({...newContact, address:e.target.value})} className="border rounded px-2 py-1"/>
                <input data-testid="add-contact-id" placeholder="ID Number" value={newContact.id_number} onChange={e=>setNewContact({...newContact, id_number:e.target.value})} className="border rounded px-2 py-1"/>
              </div>
              <div className="mt-3">
                <button data-testid="add-contact-submit" className="px-3 py-1 rounded bg-success text-white w-full" onClick={async()=>{
                  const nm = decodedName
                  const nc = { ...newContact }
                  if(!nc.email){ alert('Contact email required'); return }
                  if(!nc.name){ alert('Contact name required'); return }
                  try{
                    const current = (summary.client?.contacts)||[]
                    const updated = [...current, nc]
                    const emails = summary.client?.emails || []
                    const basePayload = { method:'POST', headers:{'Content-Type':'application/json'} }

                    // Update registry with the new contact list
                    const regRes = await fetch(`${API}/registry/clients`, {
                      ...basePayload,
                      body: JSON.stringify({
                        display_name: nm,
                        email: emails,
                        phone: summary.client?.phone||'',
                        contacts: updated
                      })
                    })
                    if(!regRes.ok){
                      const msg = await regRes.text()
                      throw new Error(msg || 'Registry update failed')
                    }

                    // Upsert into Airtable contacts with linkage to client
                    const contactsRes = await fetch(`${API}/airtable/contacts_upsert`, {
                      ...basePayload,
                      body: JSON.stringify({
                        client_name: nm,
                        client_airtable_id: summary.client?.airtable_id || '',
                        contacts: [nc]
                      })
                    })
                    if(!contactsRes.ok){
                      const msg = await contactsRes.text()
                      throw new Error(msg || 'Airtable contacts upsert failed')
                    }

                    const encoded = encodeURIComponent(nm)
                    const r = await fetch(`${API}/api/client/summary?name=${encoded}&limit=10`)
                    if(r.ok){ setSummary(await r.json()) }
                    setNewContact({ name:'', email:'', phone:'', role_desc:'', address:'', id_number:'' })
                    alert('Contact added')
                  }catch(err){
                    console.error('add contact', err)
                    alert(err?.message || 'Failed to add contact')
                  }
                }}>Add Contact</button>
              </div>
            </Card>
          </aside>
        </div>
      )}\n{tab==='files' && (
        <Card title="Files">
          <div className="text-sm text-slate-600 mb-2">Local files (top-level):</div>
          <ul className="list-disc pl-6 text-sm">
            {(summary.files||[]).map(f => (
              <li key={f.path}>{f.name}</li>
            ))}
          </ul>
        </Card>
      )}
      {tab==='emails' && (
        <Card title="Emails">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button
              type="button"
              data-testid="emails-sync"
              onClick={syncEmails}
              disabled={syncingEmails}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-300 text-sm bg-white hover:bg-slate-50 disabled:opacity-60"
            >
              {syncingEmails ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4 text-petrol" />}
              <span>משוך מיילים</span>
            </button>
            <label className="text-xs text-slate-600 flex items-center gap-1">
              חלון סנכרון (ימים)
              <input
                type="number"
                min={30}
                max={365}
                value={emailSinceDays}
                onChange={e=>{
                  const v = Math.max(30, Math.min(365, Number(e.target.value)||90))
                  setEmailSinceDays(v)
                }}
                className="w-20 rounded border px-2 py-0.5 text-xs"
              />
            </label>
            {syncStatus && <span className="text-xs text-slate-500" data-testid="emails-sync-status">{syncStatus}</span>}
            {syncResult && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500" data-testid="emails-sync-meta">
                {typeof syncResult.inserted === 'number' && !Number.isNaN(syncResult.inserted) && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {syncResult.inserted} הודעות חדשות
                  </span>
                )}
                {lastSyncLabel && <span>עודכן {lastSyncLabel}</span>}
                {syncParticipantsMeta.items.length > 0 && (
                  <span className="truncate max-w-xs">
                    מעקב אחרי: {syncParticipantsMeta.items.join(', ')}
                    {syncParticipantsMeta.extra > 0 && ` ועוד ${syncParticipantsMeta.extra}`}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                data-testid="email-filter-query"
                className="min-w-[220px] flex-1 rounded border px-2 py-1 text-sm"
                placeholder="Search subject/body/sender"
                value={emailFilters.query}
                onChange={e => setEmailFilters(f => ({ ...f, query: e.target.value }))}
              />
              <input
                data-testid="email-filter-from"
                type="date"
                className="rounded border px-2 py-1 text-sm"
                value={emailFilters.dateFrom}
                onChange={e => setEmailFilters(f => ({ ...f, dateFrom: e.target.value }))}
              />
              <input
                data-testid="email-filter-to"
                type="date"
                className="rounded border px-2 py-1 text-sm"
                value={emailFilters.dateTo}
                onChange={e => setEmailFilters(f => ({ ...f, dateTo: e.target.value }))}
              />
              <input
                data-testid="email-filter-sender"
                className="rounded border px-2 py-1 text-sm"
                placeholder="Sender"
                value={emailFilters.sender}
                onChange={e => setEmailFilters(f => ({ ...f, sender: e.target.value }))}
              />
              <input
                data-testid="email-filter-receiver"
                className="rounded border px-2 py-1 text-sm"
                placeholder="Receiver"
                value={emailFilters.receiver}
                onChange={e => setEmailFilters(f => ({ ...f, receiver: e.target.value }))}
              />
              <select
                data-testid="email-filter-attachments"
                className="rounded border px-2 py-1 text-sm"
                value={emailFilters.attachments}
                onChange={e => setEmailFilters(f => ({ ...f, attachments: e.target.value }))}
              >
                <option value="any">All</option>
                <option value="yes">Has attachments</option>
                <option value="no">No attachments</option>
              </select>
              <button
                type="button"
                className="text-xs text-petrol underline"
                onClick={()=>setEmailFilters({ query:'', sender:'', receiver:'', dateFrom:'', dateTo:'', attachments:'any' })}
              >
                Clear filters
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              Showing {filteredIdxItems.length} of {idx.items.length} loaded emails
              {idx.loading && ' (loading…)'}.
            </div>
          </div>
          {((idx.total||0) === 0) && (
            <>
              <div className="text-sm text-slate-600">Recent (local index):</div>
              <ul className="list-disc pl-6 text-sm mb-4">
                {(summary.emails||[]).slice(0,10).map(e => (
                  <li key={e.id}><span className="text-slate-500">{e.received?.slice(0,10)}:</span> {e.subject}</li>
                ))}
              </ul>
              <div className="text-sm text-slate-600">Latest (Graph): {online.loading ? 'loading…' : ''}</div>
              <ul className="list-disc pl-6 text-sm">
                {(online.emails||[]).map(e => (
                  <li key={e.id}><span className="text-slate-500">{e.received?.slice(0,10)}:</span> {e.subject}</li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-4">
            <div className="text-sm text-slate-600 mb-2 flex items-center gap-2">Emails (Indexed){idx.loading? ' – loading…' : ` — ${idx.total||0}`}
              {idx.mode && (
                <span className={`text-xs px-1.5 py-0.5 rounded border ${idx.mode==='search' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  Mode: {idx.mode==='search' ? 'Search fallback' : 'Indexed'}
                </span>
              )}
            </div>
            <div className="border rounded divide-y">
              {idx.items.length === 0 && !idx.loading && (
                <div className="p-3 text-sm text-slate-500">No indexed emails yet.</div>
              )}
              {idx.items.length > 0 && filteredIdxItems.length === 0 && (
                <div className="p-3 text-sm text-slate-500">No emails match the current filters.</div>
              )}
              {filteredIdxItems.map(it => (
                <div key={it.id} data-testid="indexed-email-row" className="p-1">
                  <button className="w-full text-left p-2 rounded hover:bg-slate-50 cursor-pointer" onClick={()=> setSel(sel && sel.id===it.id ? null : it)}>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      {attachIndicator(it)}
                      <span className="font-semibold truncate max-w-[40%]">{(it.from||'').split(/[<]/)[0].trim() || 'Unknown sender'}</span>
                      <span className="text-slate-500 truncate">— {it.subject||'(no subject)'}</span>
                      <span className="ml-auto text-xs text-slate-400">{(it.received||'').slice(0,16)}</span>
                    </div>
                    {!(sel && sel.id===it.id) && (
                      <div className={`text-xs text-slate-600 line-clamp-2 whitespace-pre-wrap ${isRtl(it.preview||it.subject||it.from) ? 'text-right' : 'text-left'}`}>
                        {(it.preview||'').trim() || 'No preview available.'}
                      </div>
                    )}
                  </button>
                  {sel && sel.id===it.id && (
                      <div className="mt-2 p-2 rounded bg-slate-50 border text-sm">
                        <div className={`text-slate-600 whitespace-pre-wrap ${isRtl(it.preview||it.subject||it.from) ? 'text-right' : 'text-left'}`}>
                          {(it.preview||'').slice(0,1000) || 'No preview available.'}
                        </div>
                        {it.has_attachments && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <Paperclip className="w-3 h-3" />
                            <span>{it.attachments_count ? `${it.attachments_count} קבצים מצורפים` : 'Contains attachments'}</span>
                          </div>
                        )}
                        <div className="mt-2 flex gap-3 flex-wrap items-center">
                          <button className="text-petrol underline" onClick={() => showEmailInline(it)}>
                            Open in Viewer
                          </button>
                          {!HIDE_OUTLOOK && (
                            <>
                              <button className="text-petrol underline" onClick={() => openEmailInOutlook(it)}>
                                Open in Outlook
                              </button>
                            <button className="text-petrol underline" onClick={() => copyOutlookLink(it)}>
                              Copy Outlook Link
                            </button>
                          </>
                          )}
                          <button
                            className="text-petrol underline"
                            onClick={() => createTaskFromEmail(it)}
                            disabled={creatingTaskId === it.id}
                          >
                            {creatingTaskId === it.id ? 'Creating…' : 'Create task'}
                          </button>
                        </div>
                      </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      {tab==='tasks' && (
        <div className="space-y-3">
          <Card title="Tasks for this client">
            {(() => {
              const qs = new URLSearchParams(loc.search)
              const qDisable = qs.get('tasks_new') === '0'
              if (qs.get('tasks_new') === '1') { try { localStorage.setItem('eislaw.useTasksNew','1') } catch {} }
              if (qs.get('tasks_new') === '0') { try { localStorage.setItem('eislaw.useTasksNew','0') } catch {} }
              let lsDisable = false
              try { lsDisable = (localStorage.getItem('eislaw.useTasksNew')||'') === '0' } catch {}
              const envDisable = String(import.meta.env.VITE_TASKS_NEW||'').toLowerCase()==='0'
              // Default to new board unless explicitly disabled
              const useNew = !(qDisable || lsDisable || envDisable)
              return useNew
                ? <TaskBoard clientName={decodedName} />
                : <TasksPanel title={`Tasks — ${decodedName}`} scope="all" clientFilter={decodedName} limit={0} />
            })()}
          </Card>
        </div>
      )}
      {tab==='rag' && (
        <Card title="RAG Insights">
          <div className="text-sm text-slate-600">Search and snippets – placeholder</div>
        </Card>
      )}
      {tab==='privacy' && (
        <Card title="Privacy">
          <div className="text-sm text-slate-600">Coming soon – will integrate PrivacyExpress.</div>
        </Card>
      )}
      {viewer.open && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6 flex items-start justify-center overflow-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-base font-semibold text-petrol">{viewer.meta.subject || 'Email'}</div>
                <div className="text-xs text-slate-500">
                  {viewer.meta.from && <span>From: {viewer.meta.from}</span>}
                  {viewer.meta.received && <span className="ml-2">Received: {viewer.meta.received}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="text-sm text-petrol underline"
                  onClick={() => {
                    if(viewer.meta.id){
                      const match = idx.items.find(m => m.id === viewer.meta.id)
                      if(match){
                        openEmailInOutlook(match)
                      }
                    }
                  }}
                >
                  Open in Outlook
                </button>
                <button className="rounded-full bg-slate-100 px-3 py-1 text-sm" onClick={closeViewer}>Close</button>
              </div>
            </div>
            <div className="p-4 min-h-[400px]">
              {viewer.loading && (
                <div className="flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading email…
                </div>
              )}
              {!viewer.loading && viewer.error && (
                <div className="rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{viewer.error}</div>
              )}
              {!viewer.loading && !viewer.error && (
                <iframe
                  title="Email body"
                  className="w-full h-[70vh] border rounded"
                  sandbox=""
                  srcDoc={viewer.html}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {clientCardOpen && modalClient && (
        <AddClientModal
          key={clientModalKey}
          apiBase={apiBase}
          mode="edit"
          initialClient={modalClient}
          onClose={closeClientCardModal}
          onAdded={handleClientModalSaved}
        />
      )}
      {airtableLinkModal.open && (
        <LinkAirtableModal
          apiBase={apiBase}
          envApi={ENV_API}
          clientName={decodedName}
          clientSummary={summary}
          onClose={handleLinkModalClose}
          onLinked={handleLinkCompleted}
        />
      )}
    </div>
  )
  async function openEmailInOutlook(item){
    if(!item?.id) return
    try{
      const data = await fetchEmailOpenData(item, { launchOutlook: true })
      if(data?.desktop_launched){
        return
      }
      if(data?.link){
        alert('Opening Outlook directly was blocked. Use “Copy Outlook Link” to paste the URL manually.')
      }else{
        alert('Unable to resolve the Outlook link for this email.')
      }
    }catch(err){
      console.error('openEmailInOutlook', err)
      alert('Failed to contact the server to open this email.')
    }
  }

  async function copyOutlookLink(item){
    if(!item?.id) return
    try{
      const data = await fetchEmailOpenData(item, { launchOutlook: false })
      const link = data?.link || ''
      if(link){
        const ok = await copyEmailLinkToClipboard(link)
        alert(ok ? 'Email link copied to clipboard.' : 'Copy blocked by browser. Please allow clipboard access.')
      } else {
        alert('No Outlook link available yet. Try again after syncing.')
      }
    }catch(err){
      console.error('copyOutlookLink', err)
      alert('Failed to copy the Outlook link.')
    }
  }

  async function showEmailInline(item){
    if(!item?.id) return
    setViewer({
      open: true,
      loading: true,
      error: '',
      html: '',
      meta: {
        id: item.id,
        subject: item.subject || '',
        from: item.from || '',
        received: item.received || ''
      }
    })
    try{
      const params = new URLSearchParams({ id: item.id, client: decodedName })
      const res = await fetch(`${API}/email/content?${params.toString()}`)
      if(!res.ok){
        const msg = await res.text()
        throw new Error(msg || 'Fetch failed')
      }
      const data = await res.json()
      setViewer({
        open: true,
        loading: false,
        error: '',
        html: data.html || '',
        meta: {
          id: item.id,
          subject: data.subject || item.subject || '',
          from: data.from || item.from || '',
          received: data.received || item.received || ''
        }
      })
    }catch(err){
      setViewer(v => ({
        ...v,
        loading: false,
        error: 'Unable to load email. ' + (err?.message || '')
      }))
    }
  }

  function closeViewer(){
    setViewer({ open: false, loading: false, error: '', html: '', meta: {} })
  }

  function resolveViewerAbsolute(value){
    if(!value) return ''
    if(/^https?:\/\//i.test(value)) return value
    const base = (API || '').replace(/\/$/,'')
    if(!base) return value
    const rel = value.startsWith('/') ? value : `/${value}`
    return `${base}${rel}`
  }

  function buildViewerUrl(item, hint){
    const hintUrl = resolveViewerAbsolute(hint)
    if(hintUrl) return hintUrl
    if(!item?.id) return ''
    const params = new URLSearchParams({ id: item.id, client: decodedName })
    return `${API}/email/viewer?${params.toString()}`
  }

  async function fetchEmailOpenData(item, opts = {}){
    const launch = opts.launchOutlook !== undefined ? opts.launchOutlook : true
    const res = await fetch(`${API}/email/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, client: decodedName, launch_outlook: launch })
    })
    if(!res.ok){
      const msg = await res.text()
      throw new Error(msg || 'email/open failed')
    }
    return res.json()
  }

}

  function buildTaskTitle(item){
    const subject = (item?.subject || '').trim()
    if(subject) return subject.length > 80 ? `${subject.slice(0,77)}…` : subject
    if(item?.from) return `Email from ${item.from}`
    return 'Email follow-up'
  }

  async function createTaskFromEmail(item){
    if(!item?.id) return
    setCreatingTaskId(item.id)
    try{
      const title = buildTaskTitle(item)
      const displayTitle = title ? `Email · ${title}` : 'Email Follow-up'
      const task = addClientTask(decodedName, displayTitle)
      const descParts = [
        item.from ? `From: ${item.from}` : null,
        item.received ? `Received: ${item.received}` : null,
        item.subject ? `Subject: ${item.subject}` : null,
      ].filter(Boolean)
      updateTaskFields(task.id, {
        desc: descParts.join('\n'),
        source: 'email',
        emailRefs: [
          ...(task.emailRefs || []),
          {
            id: item.id,
            subject: item.subject || '',
            from: item.from || '',
            received: item.received || '',
            hasAttachments: !!item.has_attachments,
            attachmentsCount: item.attachments_count || 0,
          },
        ],
      })
      try{
        await fetch(`${API}/tasks/create_or_get_folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: decodedName, task_title: displayTitle, task_id: task.id }),
        })
      }catch(err){
        console.error('tasks/create_or_get_folder', err)
      }
      window.dispatchEvent(new CustomEvent('tasks:refresh', { detail: { client: decodedName } }))
      alert('Task created from email. Open the Tasks tab to continue working on it.')
    }catch(err){
      console.error('createTaskFromEmail', err)
      alert('Failed to create a task from this email.')
    }finally{
      setCreatingTaskId(null)
    }
  }

async function copyEmailLinkToClipboard(link){
  if(!link) return false
  try{
    if(navigator?.clipboard?.writeText){
      await navigator.clipboard.writeText(link)
      return true
    }
  }catch{
    // ignore and fall back
  }
  try{
    const textarea = document.createElement('textarea')
    textarea.value = link
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  }catch{
    return false
  }
}

