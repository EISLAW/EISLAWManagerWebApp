import React, { useEffect, useMemo, useRef, useState } from 'react'
import { detectApiBase, getStoredApiBase } from '../../utils/apiBase.js'
import { md5FirstMb } from '../../lib/md5.js'

const SectionCard = React.forwardRef(function SectionCard({ title, subtitle, helper, children, footer }, ref) {
  return (
    <section ref={ref} className="card space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-petrol">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        {helper && <p className="text-xs text-slate-500">{helper}</p>}
      </header>
      {children}
      {footer && <footer className="pt-2 border-t border-slate-200">{footer}</footer>}
    </section>
  )
})

function LabeledField({ label, helper, children }) {
  return (
    <label className="block text-right space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {helper && <span className="text-xs text-slate-500">{helper}</span>}
    </label>
  )
}

function StatusPill({ tone = 'info', children }) {
  const toneMap = {
    info: 'bg-blue-50 text-blue-700 border border-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${toneMap[tone]}`}>{children}</span>
}

function StatusBadge({ status }) {
  switch (status) {
    case 'uploading':
      return <StatusPill tone="info">Uploading…</StatusPill>
    case 'transcribing':
      return <StatusPill tone="warning">Transcribing…</StatusPill>
    case 'ready':
    case 'draft':
      return <StatusPill tone="success">Ready for review</StatusPill>
    case 'error':
      return <StatusPill tone="danger">Error</StatusPill>
    case 'duplicate':
      return <StatusPill tone="danger">Duplicate</StatusPill>
    default:
      return <StatusPill tone="info">Pending</StatusPill>
  }
}

function SearchResultCard({ result }) {
  const [expanded, setExpanded] = useState(false)
  const snippet = result.snippet || result.text || 'ללא תקציר זמין.'
  const short = snippet.length > 320 ? `${snippet.slice(0, 320)}…` : snippet
  return (
    <article className="border border-slate-200 rounded-xl bg-white shadow-sm">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <div className="text-sm font-semibold text-slate-800">{result.file || 'ללא שם קובץ'}</div>
          <div className="text-xs text-slate-500">
            {result.client || 'ללא לקוח'} · {result.score ? `ציון ${result.score}` : 'תוצאה דמו'}
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-petrol underline"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'הצג פחות' : 'פתח תצוגה מלאה'}
        </button>
      </header>
      <div className="px-4 py-3 text-sm leading-relaxed text-slate-700">{expanded ? snippet : short}</div>
    </article>
  )
}

export default function RAG() {
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [apiBase, setApiBase] = useState(() => getStoredApiBase())
  const [activeTab, setActiveTab] = useState('assistant')
  const ingestRef = useRef(null)
  const assistantRef = useRef(null)

  const [inboxItems, setInboxItems] = useState([])
  const [inboxStatus, setInboxStatus] = useState('idle')
  const [inboxError, setInboxError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [bulkDomain, setBulkDomain] = useState('')
  const [bulkDate, setBulkDate] = useState('')
  const [reviewItem, setReviewItem] = useState(null)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [renameFrom, setRenameFrom] = useState('')
  const [renameTo, setRenameTo] = useState('')
  const [assistantQ, setAssistantQ] = useState('')
  const [assistantClient, setAssistantClient] = useState('')
  const [assistantDomain, setAssistantDomain] = useState('all')
  const [assistantIncludePersonal, setAssistantIncludePersonal] = useState(false)
  const [assistantIncludeDrafts, setAssistantIncludeDrafts] = useState(false)
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantSources, setAssistantSources] = useState([])
  const [assistantStatus, setAssistantStatus] = useState('idle')
  const [assistantError, setAssistantError] = useState('')

  useEffect(() => {
    const init = async () => {
      const detected = await detectApiBase([ENV_API])
      if (detected) setApiBase(detected)
    }
    init()
    refreshInbox()
    const t = setInterval(refreshInbox, 15000)
    return () => clearInterval(t)
  }, [ENV_API])

  useEffect(() => {
    const url = new URL(window.location.href)
    const tabParam = url.searchParams.get('tab')
    if (tabParam === 'assistant') setActiveTab('assistant')
    if (tabParam === 'ingest') setActiveTab('ingest')
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', activeTab)
    window.history.replaceState({}, '', url.toString())
    if (activeTab === 'ingest' && ingestRef.current) {
      ingestRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if (activeTab === 'assistant' && assistantRef.current) {
      assistantRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeTab])

  const ensureApiBase = async () => {
    if (apiBase) return apiBase
    const detected = await detectApiBase([ENV_API])
    if (detected) {
      setApiBase(detected)
      return detected
    }
    return ''
  }

  const handleAskAssistant = async (e) => {
    e?.preventDefault()
    setAssistantStatus('loading')
    setAssistantError('')
    setAssistantAnswer('')
    setAssistantSources([])
    if (!assistantQ.trim()) {
      setAssistantStatus('idle')
      setAssistantError('שאלה נדרשת.')
      return
    }
    const base = await ensureApiBase()
    if (!base) {
      setAssistantStatus('idle')
      setAssistantError('השרת לא זמין (בדוק /health).')
      return
    }
    try {
      const payload = {
        question: assistantQ.trim(),
        client: assistantClient.trim() || undefined,
        domain: assistantDomain === 'all' ? undefined : assistantDomain,
        include_personal: assistantIncludePersonal,
        include_drafts: assistantIncludeDrafts,
      }
      const res = await fetch(`${base}/api/rag/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setAssistantAnswer(data.answer || '')
      setAssistantSources(Array.isArray(data.sources) ? data.sources : [])
      setAssistantStatus('ready')
    } catch (err) {
      setAssistantStatus('idle')
      setAssistantError('קריאת העוזר נכשלה. ודא שה-API פועל.')
      console.error(err)
    }
  }

  const refreshInbox = async () => {
    setInboxStatus('loading')
    setInboxError('')
    const base = await ensureApiBase()
    if (!base) {
      setInboxStatus('idle')
      setInboxError('השרת לא זמין (בדוק /health).')
      return
    }
    try {
      const res = await fetch(`${base}/api/rag/inbox`, { credentials: 'omit' })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []
      setInboxItems(items.map((item) => ({ ...item, status: item.status || 'ready' })))
      setInboxStatus('ready')
    } catch (err) {
      setInboxStatus('idle')
      setInboxError('טעינת האינבוקס נכשלה. ודא שה-API פועל.')
      console.error(err)
    }
  }

  const handleDrop = async (fileList) => {
    if (!fileList || !fileList.length) return
    setUploading(true)
    const base = await ensureApiBase()
    if (!base) {
      setInboxError('השרת לא זמין (בדוק /health).')
      setUploading(false)
      return
    }
    for (const file of fileList) {
      const hash = await md5FirstMb(file)
      const exists = inboxItems.find((it) => it.hash === hash)
      if (exists) {
        setInboxItems((prev) => [
          { fileName: file.name, hash, status: 'duplicate', note: 'File already exists', size: file.size },
          ...prev,
        ])
        continue
      }
      const tempId = `${Date.now()}-${file.name}`
      setInboxItems((prev) => [
        { id: tempId, fileName: file.name, hash, status: 'uploading', size: file.size },
        ...prev,
      ])
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('hash', hash)
        form.append('filename', file.name)
        form.append('size', String(file.size))
        if (bulkDate) form.append('date', bulkDate)
        if (bulkDomain) form.append('domain', bulkDomain)
        const res = await fetch(`${base}/api/rag/ingest`, { method: 'POST', body: form })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const data = await res.json()
        setInboxItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  status: data.status || 'transcribing',
                  id: data.id || tempId,
                  note: data.note,
                  client: data.client || item.client,
                }
              : item
          )
        )
      } catch (err) {
        setInboxItems((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, status: 'error', note: 'Upload failed' } : item))
        )
        console.error(err)
      }
    }
    setUploading(false)
  }

  const inboxPending = useMemo(() => inboxItems.filter((i) => i.status !== 'ready'), [inboxItems])
  const inboxPublished = useMemo(() => inboxItems.filter((i) => i.status === 'ready'), [inboxItems])

  const handleDelete = async (item) => {
    const base = await ensureApiBase()
    if (!base) return
    setInboxItems((prev) => prev.filter((p) => (p.id || p.hash) !== (item.id || item.hash)))
    try {
      await fetch(`${base}/api/rag/file/${item.id || item.hash}`, { method: 'DELETE' })
      refreshInbox()
    } catch (err) {
      console.error(err)
      refreshInbox()
    }
  }

  const handlePublish = async (item) => {
    const base = await ensureApiBase()
    if (!base) return
    try {
      const res = await fetch(`${base}/api/rag/publish/${item.id || item.hash}`, { method: 'POST' })
      if (!res.ok) throw new Error('publish failed')
      const data = await res.json()
      setInboxItems((prev) =>
        prev.map((p) => ((p.id || p.hash) === (item.id || item.hash) ? { ...p, ...data } : p))
      )
    } catch (err) {
      console.error(err)
      setInboxError('פרסום נכשל. בדוק את ה-API.')
    }
  }

  const handleQuickEdit = async (item) => {
    const base = await ensureApiBase()
    if (!base) return
    const newClient = window.prompt('Client (leave blank to keep current)', item.client || '') ?? item.client
    const newDomain = window.prompt('Domain (leave blank to keep current)', item.domain || '') ?? item.domain
    const newDate = window.prompt('Date (YYYY-MM-DD)', item.date || '') ?? item.date
    const payload = { client: newClient || item.client, domain: newDomain || item.domain, date: newDate || item.date }
    try {
      const res = await fetch(`${base}/api/rag/file/${item.id || item.hash}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('update failed')
      const data = await res.json()
      setInboxItems((prev) => prev.map((p) => ((p.id || p.hash) === (item.id || item.hash) ? { ...p, ...data } : p)))
    } catch (err) {
      console.error(err)
      setInboxError('עדכון מטאדטה נכשל.')
    }
  }

  const openReviewer = async (item) => {
    const base = await ensureApiBase()
    if (!base) return
    try {
      const res = await fetch(`${base}/api/rag/reviewer/${item.id || item.hash}`)
      if (!res.ok) throw new Error('reviewer fetch failed')
      const data = await res.json()
      setReviewItem({
        ...data,
        transcript: Array.isArray(data.parsedSegments)
          ? data.parsedSegments
          : Array.isArray(data.transcript)
            ? data.transcript
            : [],
      })
    } catch (err) {
      console.error(err)
      setInboxError('טעינת סוקר נכשלה.')
    }
  }

  const handleEditPublished = async (item) => {
    setActiveTab('ingest')
    setReviewItem({
      ...item,
      transcript: Array.isArray(item.transcript) ? item.transcript : [],
    })
    await openReviewer(item)
  }

  const saveReviewer = async () => {
    if (!reviewItem) return
    const base = await ensureApiBase()
    if (!base) return
    setReviewSaving(true)
    try {
      const res = await fetch(`${base}/api/rag/reviewer/${reviewItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewItem),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      setReviewItem(data)
      refreshInbox()
    } catch (err) {
      console.error(err)
      setInboxError('שמירת שינויים נכשלה.')
    } finally {
      setReviewSaving(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">INSIGHTS / RAG</p>
              <h1 className="heading">AI / עוזר</h1>
            </div>
            {apiBase && (
              <a href={apiBase} className="text-xs text-petrol underline">
                API: {apiBase}
              </a>
            )}
          </div>

          {activeTab === 'assistant' && (
            <SectionCard
              ref={assistantRef}
              id="rag-assistant"
              title="עוזר על בסיס תמלולים"
              subtitle="שאלות AI על בסיס קטעי תמלול מאושרים."
              helper="העוזר משתמש ב-RAG ובונה תשובה מקטעי מקור."
            >
              <form className="space-y-4" onSubmit={handleAskAssistant}>
                <LabeledField label="שאלה לעוזר" helper={'לדוגמה: "אילו התנגדויות עלו בשיחות האחרונות עם יעל כהן?"'}>
                  <textarea
                    dir="auto"
                    className="w-full border border-slate-200 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-petrol/30"
                    placeholder="כתוב כאן שאלה"
                    value={assistantQ}
                    onChange={(e) => setAssistantQ(e.target.value)}
                    rows={4}
                  />
                </LabeledField>
                <div className="grid md:grid-cols-2 gap-4">
                  <LabeledField label="דומיין" helper="ברירת מחדל: הכל ללא פרסונלי">
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-petrol/30"
                      value={assistantDomain}
                      onChange={(e) => setAssistantDomain(e.target.value)}
                    >
                      <option value="all">הכול</option>
                      <option value="Client_Work">Client_Work</option>
                      <option value="Business_Ops">Business_Ops</option>
                      <option value="Personal">Personal</option>
                    </select>
                  </LabeledField>
                  <LabeledField label="לקוח (אופציונלי)">
                    <input
                      dir="auto"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol/30"
                      placeholder="שם לקוח"
                      value={assistantClient}
                      onChange={(e) => setAssistantClient(e.target.value)}
                    />
                  </LabeledField>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={assistantIncludeDrafts}
                        onChange={(e) => setAssistantIncludeDrafts(e.target.checked)}
                      />
                      כולל טיוטות
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={assistantIncludePersonal}
                        onChange={(e) => setAssistantIncludePersonal(e.target.checked)}
                      />
                      כולל Personal
                    </label>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center items-center px-4 py-2 rounded-lg bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={assistantStatus === 'loading'}
                    >
                      {assistantStatus === 'loading' ? 'מחפש...' : 'שאל את העוזר'}
                    </button>
                  </div>
                </div>
                {assistantStatus === 'ready' && <StatusPill tone="success">הושלם</StatusPill>}
              </form>
              {assistantError && <div className="text-sm text-rose-700 mt-2">{assistantError}</div>}
              {assistantAnswer && (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                  <div className="text-sm text-slate-700 whitespace-pre-line">{assistantAnswer}</div>
                  {assistantSources && assistantSources.length > 0 && (
                    <div className="text-xs text-slate-500">
                      מקורות:
                      <ul className="list-disc pr-4">
                        {assistantSources.map((s) => (
                          <li key={s.id || s.hash}>
                            {s.file || s.id} {s.client ? `· ${s.client}` : ''} {s.domain ? `· ${s.domain}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'ingest' && (
            <>
          <SectionCard
            title="RAG PIPELINE — Drop Files Here to Upload"
            subtitle="Upload first, process in background, review metadata later."
            helper="חישוב MD5 על ‎1MB‎ ראשונים, דחיית כפילויות, סטטוסי עיבוד."
            footer={
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Inbox status: {inboxStatus === 'loading' ? 'Loading…' : 'Live'}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={refreshInbox}
                    className="px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs"
                    disabled={inboxStatus === 'loading'}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            }
          >
            <div
              className="border-2 border-dashed border-petrol/40 rounded-xl bg-white px-4 py-6 text-center space-y-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(Array.from(e.dataTransfer.files || []))
              }}
            >
              <div className="text-sm text-slate-700">Drop files here or choose manually</div>
              <input
                type="file"
                multiple
                className="block mx-auto text-sm text-slate-600"
                onChange={(e) => handleDrop(Array.from(e.target.files || []))}
                accept=".txt,.md,.pdf,.docx,.doc,.rtf,.m4a,.mp3,.wav,.mp4"
              />
              <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                <LabeledField label="Bulk date (optional)">
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-sm"
                  />
                </LabeledField>
                <LabeledField label="Bulk domain (optional)">
                  <input
                    type="text"
                    value={bulkDomain}
                    onChange={(e) => setBulkDomain(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-sm"
                    placeholder="CLIENT_WORK / INTERNAL…"
                  />
                </LabeledField>
              </div>
              {uploading && <div className="text-xs text-petrol">Uploading…</div>}
              {inboxError && (
                <div className="flex items-center justify-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {inboxError}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">INBOX (pending)</div>
                <div className="text-xs text-slate-500">Defaults for new uploads: date/domain</div>
              </div>
              <div className="space-y-2">
                {inboxPending.length === 0 && (
                  <div className="border border-dashed border-slate-200 rounded-lg p-3 text-sm text-slate-500">
                    אין קבצים ממתינים כרגע.
                  </div>
                )}
                {inboxPending.map((item) => (
                  <article key={item.id || item.hash || item.fileName} className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2 bg-white">
                    <input type="checkbox" className="accent-petrol" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 flex items-center gap-2">
                        <span role="img" aria-label="file">
                          📄
                        </span>
                        {item.fileName || item.name || 'ללא שם'}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                        <StatusBadge status={item.status} />
                        {item.note && <span>{item.note}</span>}
                        {item.client && <span>Client: {item.client}</span>}
                        {item.domain && <span>Domain: {item.domain}</span>}
                        {item.hash && <span className="text-slate-400">hash: {item.hash.slice(0, 8)}…</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                        onClick={() => openReviewer(item)}
                      >
                        Open Reviewer
                      </button>
                      <button
                        className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                        onClick={() => handleQuickEdit(item)}
                      >
                        Quick Edit
                      </button>
                      <button
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded hover:bg-emerald-100"
                        onClick={() => handlePublish(item)}
                      >
                        Publish
                      </button>
                      <button
                        className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded hover:bg-rose-100"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="text-sm font-semibold text-slate-800">PUBLISHED LIBRARY (latest)</div>
                {inboxPublished.length === 0 && (
                  <div className="text-xs text-slate-500">לא נמצאו פריטים שפורסמו.</div>
                )}
                {inboxPublished.map((item) => (
                  <div key={item.id || item.hash} className="flex items-center justify-between text-sm border border-slate-200 rounded-lg px-3 py-2">
                    <div>
                      {item.date ? `${item.date}: ` : ''}
                      {item.fileName || item.name}{' '}
                      {item.domain && <span className="text-slate-500">({item.domain})</span>}
                    </div>
                    <button className="text-xs text-petrol underline" onClick={() => handleEditPublished(item)}>Edit</button>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {reviewItem && (
            <SectionCard
              title={`Reviewer — ${reviewItem.fileName || reviewItem.id}`}
              subtitle="Chat-style transcript preview (stub)"
              footer={
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Status: {reviewItem.status || 'draft'}</span>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded bg-petrol text-white text-xs"
                      onClick={() => {
                        setReviewItem((prev) => ({ ...prev, status: 'ready' }))
                        saveReviewer()
                      }}
                      disabled={reviewSaving}
                    >
                      {reviewSaving ? 'Saving…' : 'Save & Publish'}
                    </button>
                    <button className="px-3 py-1 rounded bg-slate-100 text-xs" onClick={() => setReviewItem(null)}>
                      Close
                    </button>
                  </div>
                </div>
              }
            >
              <div className="grid md:grid-cols-[280px_1fr] gap-4">
                <div className="space-y-2">
                  <LabeledField label="Date">
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                      value={reviewItem.date || ''}
                      onChange={(e) => setReviewItem((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </LabeledField>
                  <LabeledField label="Domain">
                    <input
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                      value={reviewItem.domain || ''}
                      onChange={(e) => setReviewItem((prev) => ({ ...prev, domain: e.target.value }))}
                      placeholder="CLIENT_WORK / INTERNAL"
                    />
                  </LabeledField>
                  <LabeledField label="Client">
                    <input
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                      value={reviewItem.client || ''}
                      onChange={(e) => setReviewItem((prev) => ({ ...prev, client: e.target.value }))}
                    />
                  </LabeledField>
                  <LabeledField label="Tags">
                    <input
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                      value={reviewItem.tags || ''}
                      onChange={(e) => setReviewItem((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder="comma separated"
                    />
                  </LabeledField>
                  <LabeledField label="Audio">
                    <audio
                      className="w-full"
                      controls
                      src={`${apiBase || ''}/api/rag/audio/${reviewItem.id}`}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </LabeledField>
                  <LabeledField label="Rename speaker (global)">
                    <div className="flex gap-2">
                      <input
                        className="border border-slate-200 rounded px-2 py-1 text-sm flex-1"
                        placeholder="From"
                        value={renameFrom}
                        onChange={(e) => setRenameFrom(e.target.value)}
                      />
                      <input
                        className="border border-slate-200 rounded px-2 py-1 text-sm flex-1"
                        placeholder="To"
                        value={renameTo}
                        onChange={(e) => setRenameTo(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-2 py-1 bg-slate-100 rounded text-xs"
                        onClick={() => {
                          if (!renameFrom || !renameTo) return
                          const next = (reviewItem.transcript || []).map((seg) => ({
                            ...seg,
                            speaker: seg.speaker === renameFrom ? renameTo : seg.speaker,
                          }))
                          setReviewItem((prev) => ({ ...prev, transcript: next }))
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </LabeledField>
                </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-slate-500">Segments</div>
                      <button
                        type="button"
                        className="text-xs text-petrol underline"
                        onClick={() =>
                          setReviewItem((prev) => ({
                            ...prev,
                            transcript: [...(prev?.transcript || []), { speaker: '', start: '', end: '', text: '' }],
                          }))
                        }
                      >
                        Add segment
                      </button>
                    </div>
                    {(reviewItem.transcript || []).map((seg, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <input
                            className="border border-slate-200 rounded px-2 py-1 text-xs"
                          value={seg.speaker || ''}
                          onChange={(e) => {
                            const next = [...reviewItem.transcript]
                            next[idx] = { ...next[idx], speaker: e.target.value }
                            setReviewItem((prev) => ({ ...prev, transcript: next }))
                          }}
                        />
                        <input
                          className="border border-slate-200 rounded px-2 py-1 text-xs w-20"
                          value={seg.start || ''}
                          onChange={(e) => {
                            const next = [...reviewItem.transcript]
                            next[idx] = { ...next[idx], start: e.target.value }
                            setReviewItem((prev) => ({ ...prev, transcript: next }))
                          }}
                          placeholder="00:00"
                        />
                        <input
                          className="border border-slate-200 rounded px-2 py-1 text-xs w-20"
                          value={seg.end || ''}
                            onChange={(e) => {
                              const next = [...reviewItem.transcript]
                              next[idx] = { ...next[idx], end: e.target.value }
                              setReviewItem((prev) => ({ ...prev, transcript: next }))
                            }}
                            placeholder="00:05"
                          />
                          <button
                            type="button"
                            className="text-rose-600 underline ml-auto"
                            onClick={() => {
                              const next = [...(reviewItem.transcript || [])]
                              next.splice(idx, 1)
                              setReviewItem((prev) => ({ ...prev, transcript: next }))
                            }}
                          >
                            Delete
                          </button>
                        </div>
                        <textarea
                          className="w-full border border-slate-200 rounded px-2 py-2 text-sm"
                          value={seg.text || ''}
                          onChange={(e) => {
                          const next = [...reviewItem.transcript]
                          next[idx] = { ...next[idx], text: e.target.value }
                          setReviewItem((prev) => ({ ...prev, transcript: next }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}
          </>
          )}
        </div>
        <aside className="w-64 space-y-3">
          <div className="text-sm font-semibold text-slate-700">ניווט</div>
          <div className="space-y-2">
            <button
              className={`w-full border rounded-lg px-3 py-2 text-sm ${activeTab === 'ingest' ? 'border-petrol text-petrol bg-petrol/5' : 'border-slate-200 text-slate-700'}`}
              onClick={() => setActiveTab('ingest')}
            >
              קליטה ואישור
            </button>
            <button
              className={`w-full border rounded-lg px-3 py-2 text-sm ${activeTab === 'assistant' ? 'border-petrol text-petrol bg-petrol/5' : 'border-slate-200 text-slate-700'}`}
              onClick={() => setActiveTab('assistant')}
            >
              AI / עוזר
            </button>
          </div>
        </aside>
      </div>
      {activeTab === 'assistant' && assistantAnswer === '' && assistantStatus === 'idle' && (
        <div className="text-xs text-slate-500 px-2">API Host: {apiBase || 'n/a'}</div>
      )}
    </div>
  )
}
