import React, { useEffect, useState } from 'react'
import { detectApiBase, getStoredApiBase } from '../../utils/apiBase.js'

function SectionCard({ title, subtitle, helper, children, footer }) {
  return (
    <section className="card space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-petrol">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        {helper && <p className="text-xs text-slate-500">{helper}</p>}
      </header>
      {children}
      {footer && <footer className="pt-2 border-t border-slate-200">{footer}</footer>}
    </section>
  )
}

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

export default function RAG() {
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [apiBase, setApiBase] = useState(() => getStoredApiBase())
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [results, setResults] = useState([])
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchError, setSearchError] = useState('')

  const [docClient, setDocClient] = useState('')
  const [docFile, setDocFile] = useState(null)
  const [transcribeStatus, setTranscribeStatus] = useState('idle')
  const [transcribeError, setTranscribeError] = useState('')
  const [transcribeResult, setTranscribeResult] = useState(null)

  useEffect(() => {
    const init = async () => {
      const detected = await detectApiBase([ENV_API])
      if (detected) setApiBase(detected)
    }
    init()
  }, [ENV_API])

  const ensureApiBase = async () => {
    if (apiBase) return apiBase
    const detected = await detectApiBase([ENV_API])
    if (detected) {
      setApiBase(detected)
      return detected
    }
    return ''
  }

  const handleSearch = async (e) => {
    e?.preventDefault()
    setSearchStatus('loading')
    setSearchError('')
    setResults([])
    const base = await ensureApiBase()
    if (!base) {
      setSearchStatus('idle')
      setSearchError('השרת לא זמין (בדוק /health).')
      return
    }
    try {
      const params = new URLSearchParams({ q: query || '' })
      if (clientFilter.trim()) params.append('client', clientFilter.trim())
      const res = await fetch(`${base}/api/rag/search?${params.toString()}`, { credentials: 'omit' })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setResults(Array.isArray(data.results) ? data.results : [])
      setSearchStatus('ready')
    } catch (err) {
      setSearchStatus('idle')
      setSearchError('החיפוש נכשל. ודא שה-API פועל.')
      console.error(err)
    }
  }

  const handleTranscribe = async (e) => {
    e.preventDefault()
    setTranscribeStatus('loading')
    setTranscribeError('')
    setTranscribeResult(null)
    if (!docFile) {
      setTranscribeStatus('idle')
      setTranscribeError('בחר קובץ לפני השליחה.')
      return
    }
    const base = await ensureApiBase()
    if (!base) {
      setTranscribeStatus('idle')
      setTranscribeError('השרת לא זמין (בדוק /health).')
      return
    }
    try {
      const form = new FormData()
      form.append('file', docFile)
      if (docClient.trim()) form.append('client', docClient.trim())
      const res = await fetch(`${base}/api/rag/transcribe_doc`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setTranscribeResult(data)
      setTranscribeStatus('ready')
    } catch (err) {
      setTranscribeStatus('idle')
      setTranscribeError('העלאה נכשלה. ודא שהנתיב זמין.')
      console.error(err)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Insights / RAG</p>
          <h1 className="heading">חיפוש וקליטת תמלולים</h1>
        </div>
        {apiBase && <StatusPill>API: {apiBase}</StatusPill>}
      </div>

      <SectionCard
        title="חיפוש בתמלולים"
        subtitle="שאל כל שאלה וקבל קטעים ממוסמכים"
        helper="התוצאות יכללו קישורים לקבצים המקומיים כאשר יהיו זמינים."
        footer={
          searchStatus === 'ready' ? (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>הושלם בהצלחה</span>
              <StatusPill tone="success">נשמר</StatusPill>
            </div>
          ) : (
            <div className="text-xs text-slate-500">השליחה מעבדת בצד השרת עם רמת רגישות גבוהה.</div>
          )
        }
      >
        <form className="space-y-4" onSubmit={handleSearch}>
          <LabeledField label="שאלת חיפוש" helper={'לדוגמה: "מה היו ההתנגדויות בשיחה האחרונה?"'}>
            <input
              dir="auto"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol/30"
              placeholder="חפש בתמלולים…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </LabeledField>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
            <LabeledField label="סינון לקוח (אופציונלי)" helper="הגבל את החיפוש ללקוח אחד">
              <input
                dir="auto"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol/30"
                placeholder="שם לקוח / מזהה"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              />
            </LabeledField>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={searchStatus === 'loading'}
            >
              {searchStatus === 'loading' ? 'מחפש…' : 'הרץ חיפוש'}
            </button>
          </div>
        </form>
        {searchError && (
          <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2" role="alert">
            {searchError}
          </div>
        )}
        <div className="border border-slate-200 rounded-lg divide-y bg-white">
          {results.length === 0 && (
            <div className="p-4 text-sm text-slate-500">{searchStatus === 'loading' ? 'מחפש…' : 'אין תוצאות להצגה עדיין.'}</div>
          )}
          {results.map((r, idx) => (
            <div key={idx} className="p-4 space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">{r.file || 'ללא שם קובץ'}</div>
              <div className="text-base text-slate-800">{r.snippet || r.text || 'ללא תקציר זמין.'}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="קליטת מסמך / תמלול"
        subtitle="שמור תמלול מהדסקטופ ורשום אותו ל-RAG"
        helper="הוספת שם לקוח מסייעת לקשר את התוצאה לכרטיס הלקוח."
        footer={
          transcribeResult ? (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                עודכן:{' '}
                {transcribeResult.createdAt ? new Date(transcribeResult.createdAt).toLocaleString('he-IL') : '—'}
              </span>
              <StatusPill tone="success">הועלה</StatusPill>
            </div>
          ) : (
            <div className="text-xs text-slate-500">מומלץ לשמור קובץ עד ‎10MB‎ (TXT, PDF, DOCX, אודיו).</div>
          )
        }
      >
        <form className="space-y-4" onSubmit={handleTranscribe}>
          <LabeledField label="שם לקוח (אופציונלי)" helper="יופיע בתוך התוצאה ויקל על סינון מאוחר יותר">
            <input
              dir="auto"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol/30"
              placeholder="לדוגמה: יעל כהן / Unicell"
              value={docClient}
              onChange={(e) => setDocClient(e.target.value)}
            />
          </LabeledField>
          <LabeledField label="בחר קובץ" helper="מותר: ‎.txt .docx .pdf .m4a .mp3 .wav (עד ‎10MB‎)">
            <input
              type="file"
              className="w-full border border-dashed border-petrol/40 rounded-lg px-3 py-5 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-petrol/10 file:px-4 file:py-2 file:text-petrol"
              accept=".txt,.md,.pdf,.docx,.doc,.rtf,.m4a,.mp3,.wav"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            />
          </LabeledField>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={transcribeStatus === 'loading'}
          >
            {transcribeStatus === 'loading' ? 'מעלה…' : 'העלה ושמור ל-RAG'}
          </button>
        </form>
        {transcribeError && (
          <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2" role="alert">
            {transcribeError}
          </div>
        )}
        {transcribeResult && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>קובץ: {transcribeResult.fileName}</span>
              <StatusPill tone="info">{transcribeResult.status}</StatusPill>
            </div>
            <div>לקוח: {transcribeResult.client || 'לא הוזן'}</div>
            <div className="text-xs text-slate-500">תצוגה מקדימה:</div>
            <p className="text-sm leading-relaxed">{transcribeResult.transcriptPreview}</p>
            {transcribeResult.note && <div className="text-xs text-slate-500">{transcribeResult.note}</div>}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
