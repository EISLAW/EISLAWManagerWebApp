import React, { useEffect, useMemo, useRef, useState } from 'react'
import { detectApiBase, getStoredApiBase } from '../../utils/apiBase.js'
import { md5FirstMb } from '../../lib/md5.js'

const SectionCard = React.forwardRef(function SectionCard({ title, subtitle, helper, children, footer, testId }, ref) {
  return (
    <section ref={ref} className="card space-y-4" data-testid={testId}>
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

function StatusPill({ tone = 'info', children, testId }) {
  const toneMap = {
    info: 'bg-blue-50 text-blue-700 border border-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${toneMap[tone]}`} data-testid={testId}>{children}</span>
}

// Chat bubble component for transcript segments (WhatsApp-style per PRD)
function ChatBubble({ segment, index, isEven, onTextChange, onSpeakerChange, onDelete, onPlayFromTimestamp, audioRef }) {
  const parseTime = (timeStr) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
  }

  const handleClick = () => {
    if (segment.start && audioRef?.current) {
      const seconds = parseTime(segment.start)
      audioRef.current.currentTime = seconds
      audioRef.current.play()
    }
  }

  return (
    <div
      className={`flex ${isEven ? 'justify-start' : 'justify-end'} mb-3`}
      data-testid={`rag.reviewer.segment.${index}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm cursor-pointer transition-all hover:shadow-md ${
          isEven
            ? 'bg-white border border-slate-200 rounded-tl-sm'
            : 'bg-petrol/10 border border-petrol/20 rounded-tr-sm'
        }`}
        onClick={handleClick}
        title={segment.start ? `Click to play from ${segment.start}` : 'No timestamp'}
        data-action="segment.play"
      >
        <div className="flex items-center gap-2 mb-1">
          <input
            className="text-xs font-semibold text-petrol bg-transparent border-b border-transparent hover:border-slate-300 focus:border-petrol focus:outline-none px-1 py-0.5 min-w-[60px]"
            value={segment.speaker || ''}
            onChange={(e) => onSpeakerChange(index, e.target.value)}
            placeholder="Speaker"
            onClick={(e) => e.stopPropagation()}
            data-testid={`rag.reviewer.segment.${index}.speaker`}
          />
          {segment.start && (
            <span className="text-xs text-slate-400">{segment.start}</span>
          )}
          <button
            type="button"
            className="ml-auto text-rose-500 hover:text-rose-700 p-1 min-h-[28px] min-w-[28px] flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onDelete(index) }}
            title="Delete segment"
            data-testid={`rag.reviewer.segment.${index}.delete`}
            data-action="segment.delete"
          >
            ×
          </button>
        </div>
        <textarea
          className="w-full bg-transparent text-sm text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-petrol/30 rounded px-1 py-1"
          value={segment.text || ''}
          onChange={(e) => onTextChange(index, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          rows={Math.max(2, Math.ceil((segment.text || '').length / 50))}
          data-testid={`rag.reviewer.segment.${index}.text`}
        />
      </div>
    </div>
  )
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
  const [activeTab, setActiveTab] = useState('ingest')
  const ingestRef = useRef(null)
  const assistantRef = useRef(null)

  const [inboxItems, setInboxItems] = useState([])
  const [inboxStatus, setInboxStatus] = useState('idle')
  const [inboxError, setInboxError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [bulkDomain, setBulkDomain] = useState('')
  const [bulkDate, setBulkDate] = useState('')
  const [bulkClient, setBulkClient] = useState('')
  const [reviewItem, setReviewItem] = useState(null)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [renameFrom, setRenameFrom] = useState('')
  const [renameTo, setRenameTo] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const audioRef = useRef(null)
  const reviewerRef = useRef(null)
  const [assistantQ, setAssistantQ] = useState('')
  const [assistantClient, setAssistantClient] = useState('')
  const [assistantDomain, setAssistantDomain] = useState('all')
  const [assistantIncludePersonal, setAssistantIncludePersonal] = useState(false)
  const [assistantIncludeDrafts, setAssistantIncludeDrafts] = useState(false)
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantSources, setAssistantSources] = useState([])
  const [assistantStatus, setAssistantStatus] = useState('idle')
  const [assistantError, setAssistantError] = useState('')

  // Zoom transcripts state
  const [zoomTranscripts, setZoomTranscripts] = useState([])
  const [zoomStatus, setZoomStatus] = useState("idle")
  const [zoomPreview, setZoomPreview] = useState(null)
  const [zoomImporting, setZoomImporting] = useState(false)
  const [importedZoomIds, setImportedZoomIds] = useState(new Set())
  const [zoomImportMeta, setZoomImportMeta] = useState({ client: "", date: "", domain: "Client_Work" })

  // Zoom Cloud Recordings state
  const [zoomCloudRecordings, setZoomCloudRecordings] = useState([])
  const [zoomCloudLoading, setZoomCloudLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [transcribingId, setTranscribingId] = useState(null)
  const [zoomCloudLog, setZoomCloudLog] = useState([])
  const [zoomCloudFilter, setZoomCloudFilter] = useState('')
  const [availableClients, setAvailableClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const loadAvailableClients = async () => {
    const base = await ensureApiBase()
    if (!base) return
    try {
      setClientsLoading(true)
      const res = await fetch()
      if (!res.ok) throw new Error("Failed")
      const list = await res.json()
      const names = Array.isArray(list) ? list.map(c => ({id: c.id, name: c.name || c.display_name || ""})).filter(c => c.name) : []
      setAvailableClients(names)
    } catch (e) {
      console.error("Failed to load clients:", e)
      setAvailableClients([])
    } finally {
      setClientsLoading(false)
    }
  }


  useEffect(() => {
    const init = async () => {
      const detected = await detectApiBase([ENV_API])
      if (detected) setApiBase(detected)
    }
    init()
    refreshInbox()
    loadAvailableClients()
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

  // Load Zoom transcripts when ingest tab is active
  useEffect(() => {
    if (activeTab === 'ingest') {
      refreshZoomTranscripts()
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

  // Zoom transcripts functions
  // ===== Zoom Cloud Recording Functions =====
  const syncFromZoomCloud = async () => {
    const base = await ensureApiBase()
    if (!base) return
    setZoomCloudLoading(true)
    try {
      const resp = await fetch(base + '/api/zoom/sync', { method: 'POST' })
      if (!resp.ok) throw new Error('Sync failed')
      addLog('success', 'Transcription completed successfully!')
      await refreshZoomCloud()
    } catch (err) {
      console.error('Zoom sync error:', err)
    } finally {
      setZoomCloudLoading(false)
    }
  }

  const refreshZoomCloud = async () => {
    const base = await ensureApiBase()
    if (!base) return
    try {
      const resp = await fetch(base + '/api/zoom/recordings')
      if (resp.ok) {
        const data = await resp.json()
        setZoomCloudRecordings(data.recordings || [])
      }
    } catch (err) {
      console.error('Refresh zoom cloud error:', err)
    }
  }

  const downloadZoomRecording = async (recording) => {
    const base = await ensureApiBase()
    if (!base) return
    setDownloadingId(recording.zoom_id)
    setZoomCloudLog([])
    addLog('info', 'Downloading from Zoom: ' + recording.topic)
    try {
      const resp = await fetch(base + '/api/zoom/download/' + recording.zoom_id, { method: 'POST' })
      if (!resp.ok) {
        let errorDetail = 'Download failed'
        try {
          const errorJson = await resp.json()
          if (errorJson.detail) errorDetail = errorJson.detail
        } catch (e) {}
        throw new Error(errorDetail)
      }
      addLog('success', 'Download completed! Ready to transcribe.')
      await refreshZoomCloud()
    } catch (err) {
      addLog('error', 'Error: ' + err.message)
      console.error('Download error:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const addLog = (type, msg) => setZoomCloudLog(prev => [...prev, { time: new Date().toLocaleTimeString(), type, msg }])

  const transcribeZoomRecording = async (recording) => {
    const base = await ensureApiBase()
    if (!base) return
    setTranscribingId(recording.zoom_id)
    setZoomCloudLog([])
    addLog('info', 'Starting transcription: ' + recording.topic)
    addLog('info', 'Downloading audio from Azure...')
    try {
      const resp = await fetch(base + '/api/zoom/transcribe/' + recording.zoom_id, { method: 'POST' })
      if (!resp.ok) {
        // Try to get detailed error message from API response
        let errorDetail = 'Transcription failed'
        try {
          const errorJson = await resp.json()
          if (errorJson.detail) errorDetail = errorJson.detail
        } catch (e) {}
        throw new Error(errorDetail)
      }
      addLog('info', 'Sending to Gemini for transcription...')
      addLog('success', 'Transcription completed successfully!')
      await refreshZoomCloud()
    } catch (err) {
      addLog('error', 'Error: ' + err.message)
      console.error('Transcribe error:', err)
    } finally {
      setTranscribingId(null)
    }
  }

  const skipZoomRecording = async (recording) => {
    if (!window.confirm('Skip "' + recording.topic + '"?')) return
    const base = await ensureApiBase()
    if (!base) return
    try {
      const resp = await fetch(base + '/api/zoom/skip/' + recording.zoom_id, { method: 'POST' })
      if (!resp.ok) throw new Error('Skip failed')
      addLog('success', 'Transcription completed successfully!')
      await refreshZoomCloud()
    } catch (err) {
      console.error('Skip error:', err)
    }
  }

  const getZoomStatusBadge = (status) => {
    const badges = {
      'in_zoom': { tone: 'info', label: 'In Zoom' },
      'downloading': { tone: 'warning', label: 'Downloading...' },
      'pending': { tone: 'warning', label: 'Pending' },
      'completed': { tone: 'success', label: 'Completed' },
      'skipped': { tone: 'neutral', label: 'Skipped' },
      'failed': { tone: 'danger', label: 'Failed' }
    }
    return badges[status] || { tone: 'info', label: status }
  }

  const refreshZoomTranscripts = async () => {
    setZoomStatus("loading")
    const base = await ensureApiBase()
    if (!base) {
      setZoomStatus("idle")
      return
    }
    try {
      const res = await fetch(`${base}/api/zoom/transcripts`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setZoomTranscripts(Array.isArray(data.transcripts) ? data.transcripts : [])
      setZoomStatus("ready")
    } catch (err) {
      setZoomStatus("idle")
      console.error("Failed to fetch Zoom transcripts:", err)
    }
  }

  const previewZoomTranscript = async (transcript) => {
    const base = await ensureApiBase()
    if (!base) return
    loadAvailableClients()

    const titleStr = transcript.title || "Zoom Recording"
    const dateStr = transcript.date || ""
    setZoomImportMeta({ client: titleStr, date: dateStr, domain: "Client_Work" })

    // If transcript already has content, use it directly
    if (transcript.transcript) {
      let contentText = ""
      if (Array.isArray(transcript.transcript)) {
        contentText = transcript.transcript.map(seg => seg.text || seg).join("\n\n")
      } else if (typeof transcript.transcript === "string") {
        contentText = transcript.transcript
      }
      setZoomPreview({ ...transcript, content: contentText, title: titleStr })
      return
    }

    // Otherwise try to fetch from API
    try {
      const res = await fetch(`${base}/api/zoom/transcripts/${encodeURIComponent(transcript.id)}`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setZoomPreview({ ...transcript, content: data.content, title: data.title || titleStr })
    } catch (err) {
      console.error("Failed to preview transcript:", err)
      setZoomPreview({ ...transcript, content: "תמלול לא זמין. נסה לתמלל את ההקלטה תחילה.", title: titleStr })
    }
  }

  const importZoomToRag = async (transcript) => {
    setZoomImporting(true)
    const base = await ensureApiBase()
    if (!base) {
      setZoomImporting(false)
      return
    }
    try {
      // Extract client name from filename (format: date_clientname_uuid.txt)
      const parts = transcript.filename.replace(".txt", "").split("_")
      const clientName = parts.length > 2 ? parts.slice(1, -1).join(" ") : ""
      const dateStr = parts[0] || ""
      
      const res = await fetch(`${base}/api/zoom/transcripts/${encodeURIComponent(transcript.id)}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: zoomImportMeta.client,
          domain: zoomImportMeta.domain,
          date: zoomImportMeta.date
        })
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      await refreshInbox()
    loadAvailableClients()
      setZoomPreview(null)
      setImportedZoomIds(prev => new Set([...prev, transcript.id]))
    } catch (err) {
      console.error("Failed to import transcript:", err)
      alert("שגיאה בייבוא התמלול")
    } finally {
      setZoomImporting(false)
    }
  }

  const downloadZoomTranscript = async (transcript) => {
    const base = await ensureApiBase()
    if (!base) return
    try {
      const res = await fetch(`${base}/api/zoom/transcripts/${encodeURIComponent(transcript.id)}`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      const blob = new Blob([data.content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = transcript.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download transcript:", err)
      alert("שגיאה בהורדת התמלול")
    }
  }
const deleteZoomTranscript = async (transcript) => {
    if (!window.confirm(`למחוק את התמלול ${transcript.title || transcript.filename || "Zoom Recording"}?`)) return
    const base = await ensureApiBase()
    if (!base) return
    try {
      const res = await fetch(`${base}/api/zoom/transcripts/${encodeURIComponent(transcript.id)}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      setZoomTranscripts(prev => prev.filter(t => t.id !== transcript.id))
    } catch (err) {
      console.error("Failed to delete transcript:", err)
      alert("שגיאה במחיקת התמלול")
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

  // Select all / toggle selection
  const toggleSelectItem = (itemId) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const selectAllPending = () => {
    const allIds = new Set(inboxPending.map((i) => i.id || i.hash))
    setSelectedItems(allIds)
  }

  const clearSelection = () => setSelectedItems(new Set())

  const isAllSelected = inboxPending.length > 0 && inboxPending.every((i) => selectedItems.has(i.id || i.hash))

  // Bulk actions
  const applyBulkMetadata = async (field, value) => {
    if (!value || selectedItems.size === 0) return
    const base = await ensureApiBase()
    if (!base) return
    for (const itemId of selectedItems) {
      const item = inboxItems.find((i) => (i.id || i.hash) === itemId)
      if (!item) continue
      try {
        const payload = { [field]: value }
        await fetch(`${base}/api/rag/file/${item.id || item.hash}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (err) {
        console.error(err)
      }
    }
    refreshInbox()
    loadAvailableClients()
    clearSelection()
  }

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!window.confirm(`Delete ${selectedItems.size} selected items?`)) return
    const base = await ensureApiBase()
    if (!base) return
    for (const itemId of selectedItems) {
      try {
        await fetch(`${base}/api/rag/file/${itemId}`, { method: 'DELETE' })
      } catch (err) {
        console.error(err)
      }
    }
    refreshInbox()
    loadAvailableClients()
    clearSelection()
  }

  const bulkPublish = async () => {
    if (selectedItems.size === 0) return
    const base = await ensureApiBase()
    if (!base) return
    for (const itemId of selectedItems) {
      try {
        await fetch(`${base}/api/rag/publish/${itemId}`, { method: 'POST' })
      } catch (err) {
        console.error(err)
      }
    }
    refreshInbox()
    loadAvailableClients()
    clearSelection()
  }

  const handleDelete = async (item) => {
    const base = await ensureApiBase()
    if (!base) return
    setInboxItems((prev) => prev.filter((p) => (p.id || p.hash) !== (item.id || item.hash)))
    try {
      await fetch(`${base}/api/rag/file/${item.id || item.hash}`, { method: 'DELETE' })
      refreshInbox()
    loadAvailableClients()
    } catch (err) {
      console.error(err)
      refreshInbox()
    loadAvailableClients()
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
      const parsedFromRaw = () => {
        const lines = (data.rawText || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
        return lines.map((text) => ({ speaker: '', start: '', end: '', text }))
      }
      setReviewItem({
        ...data,
        transcript: Array.isArray(data.parsedSegments)
          ? data.parsedSegments
          : Array.isArray(data.transcript) && data.transcript.length
            ? data.transcript
            : parsedFromRaw(),
      })
      // Auto-scroll to reviewer panel
      setTimeout(() => {
        reviewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
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
    loadAvailableClients()
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
              testId="rag.assistant"
              title="עוזר על בסיס תמלולים"
              subtitle="שאלות AI על בסיס קטעי תמלול מאושרים."
              helper="העוזר משתמש ב-RAG ובונה תשובה מקטעי מקור."
            >
              <form className="space-y-4" onSubmit={handleAskAssistant} data-testid="rag.assistant.form">
                <LabeledField label="שאלה לעוזר" helper={'לדוגמה: "אילו התנגדויות עלו בשיחות האחרונות עם יעל כהן?"'}>
                  <textarea
                    dir="auto"
                    className="w-full border border-slate-200 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-petrol/30 min-h-[100px]"
                    placeholder="כתוב כאן שאלה"
                    value={assistantQ}
                    onChange={(e) => setAssistantQ(e.target.value)}
                    rows={4}
                    data-testid="rag.assistant.question"
                    aria-label="Question for AI assistant"
                  />
                </LabeledField>
                <div className="grid md:grid-cols-2 gap-4">
                  <LabeledField label="דומיין" helper="ברירת מחדל: הכל ללא פרסונלי">
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-petrol/30"
                      value={assistantDomain}
                      onChange={(e) => setAssistantDomain(e.target.value)}
                      data-testid="rag.assistant.domain"
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
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-petrol/30"
                      placeholder="שם לקוח"
                      value={assistantClient}
                      onChange={(e) => setAssistantClient(e.target.value)}
                      data-testid="rag.assistant.client"
                    />
                  </LabeledField>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 border border-slate-200 rounded-lg px-3 py-3 bg-slate-50">
                    <label className="flex items-center gap-2 text-sm text-slate-700 min-h-[28px]">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={assistantIncludeDrafts}
                        onChange={(e) => setAssistantIncludeDrafts(e.target.checked)}
                        data-testid="rag.assistant.includeDrafts"
                      />
                      כולל טיוטות
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 min-h-[28px]">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={assistantIncludePersonal}
                        onChange={(e) => setAssistantIncludePersonal(e.target.checked)}
                        data-testid="rag.assistant.includePersonal"
                      />
                      כולל Personal
                    </label>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center items-center px-4 py-3 min-h-[44px] rounded-lg bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={assistantStatus === 'loading'}
                      data-testid="rag.assistant.submit"
                      data-action="assistant.ask"
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
              role="region"
              aria-label="File drop zone"
              data-testid="rag.dropzone"
            >
              <div className="text-sm text-slate-700">Drop files here or choose manually</div>
              <input
                type="file"
                multiple
                className="block mx-auto text-sm text-slate-600"
                onChange={(e) => handleDrop(Array.from(e.target.files || []))}
                accept=".txt,.md,.pdf,.docx,.doc,.rtf,.m4a,.mp3,.wav,.mp4"
                data-testid="rag.dropzone.fileInput"
                aria-label="Choose files to upload"
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

            <div className="mt-4 space-y-4" data-testid="rag.inbox.container">
              {/* Inbox header with Select All and Bulk Actions */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm" data-testid="rag.inbox.selectAll">
                    <input
                      type="checkbox"
                      className="accent-petrol w-5 h-5"
                      checked={isAllSelected}
                      onChange={() => isAllSelected ? clearSelection() : selectAllPending()}
                      data-action="inbox.selectAll"
                    />
                    <span className="font-semibold text-slate-800">INBOX ({inboxPending.length})</span>
                  </label>
                  {selectedItems.size > 0 && (
                    <span className="text-xs text-petrol">{selectedItems.size} selected</span>
                  )}
                </div>

                {/* Bulk Actions Dropdown */}
                {selectedItems.size > 0 && (
                  <div className="flex items-center gap-2 flex-wrap" data-testid="rag.inbox.bulkActions">
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white"
                      onChange={(e) => {
                        if (e.target.value === 'delete') bulkDelete()
                        else if (e.target.value === 'publish') bulkPublish()
                        else if (e.target.value === 'applyDate' && bulkDate) applyBulkMetadata('date', bulkDate)
                        else if (e.target.value === 'applyDomain' && bulkDomain) applyBulkMetadata('domain', bulkDomain)
                        else if (e.target.value === 'applyClient' && bulkClient) applyBulkMetadata('client', bulkClient)
                        e.target.value = ''
                      }}
                      defaultValue=""
                      data-testid="rag.inbox.bulkActions.select"
                      data-action="inbox.bulkAction"
                    >
                      <option value="" disabled>Bulk Actions…</option>
                      <option value="publish">Publish Selected</option>
                      <option value="delete">Delete Selected</option>
                      {bulkDate && <option value="applyDate">Apply Date ({bulkDate})</option>}
                      {bulkDomain && <option value="applyDomain">Apply Domain ({bulkDomain})</option>}
                      {bulkClient && <option value="applyClient">Apply Client ({bulkClient})</option>}
                    </select>
                    <button
                      type="button"
                      className="px-3 py-2 min-h-[44px] text-sm text-slate-600 hover:text-slate-800"
                      onClick={clearSelection}
                      data-testid="rag.inbox.clearSelection"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk metadata inputs with Apply buttons */}
              <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="border border-slate-200 rounded px-3 py-2 text-sm min-h-[44px]"
                    data-testid="rag.inbox.bulkDate"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 min-h-[44px] bg-petrol/10 text-petrol rounded hover:bg-petrol/20 text-sm disabled:opacity-50"
                    onClick={() => applyBulkMetadata('date', bulkDate)}
                    disabled={!bulkDate || selectedItems.size === 0}
                    data-testid="rag.inbox.applyDate"
                    data-action="inbox.applyDate"
                  >
                    Apply Date
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bulkDomain}
                    onChange={(e) => setBulkDomain(e.target.value)}
                    className="border border-slate-200 rounded px-3 py-2 text-sm min-h-[44px] w-32"
                    placeholder="Domain"
                    data-testid="rag.inbox.bulkDomain"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 min-h-[44px] bg-petrol/10 text-petrol rounded hover:bg-petrol/20 text-sm disabled:opacity-50"
                    onClick={() => applyBulkMetadata('domain', bulkDomain)}
                    disabled={!bulkDomain || selectedItems.size === 0}
                    data-testid="rag.inbox.applyDomain"
                    data-action="inbox.applyDomain"
                  >
                    Apply Domain
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bulkClient}
                    onChange={(e) => setBulkClient(e.target.value)}
                    className="border border-slate-200 rounded px-3 py-2 text-sm min-h-[44px] w-32"
                    placeholder="Client"
                    data-testid="rag.inbox.bulkClient"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 min-h-[44px] bg-petrol/10 text-petrol rounded hover:bg-petrol/20 text-sm disabled:opacity-50"
                    onClick={() => applyBulkMetadata('client', bulkClient)}
                    disabled={!bulkClient || selectedItems.size === 0}
                    data-testid="rag.inbox.applyClient"
                    data-action="inbox.applyClient"
                  >
                    Apply Client
                  </button>
                </div>
              </div>

              {/* Inbox items list */}
              <div className="space-y-2" data-testid="rag.inbox.list">
                {inboxPending.length === 0 && (
                  <div className="border border-dashed border-slate-200 rounded-lg p-3 text-sm text-slate-500">
                    אין קבצים ממתינים כרגע.
                  </div>
                )}
                {inboxPending.map((item) => {
                  const itemId = item.id || item.hash
                  const isSelected = selectedItems.has(itemId)
                  return (
                  <article
                    key={item.id || item.hash || item.fileName}
                    className={`flex items-center gap-3 border rounded-lg px-3 py-3 bg-white transition-colors ${isSelected ? 'border-petrol bg-petrol/5' : 'border-slate-200'}`}
                    data-testid={`rag.inbox.item.${itemId}`}
                  >
                    <input
                      type="checkbox"
                      className="accent-petrol w-5 h-5 min-w-[20px]"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(itemId)}
                      data-testid={`rag.inbox.item.${itemId}.checkbox`}
                      data-action="inbox.item.select"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 flex items-center gap-2 truncate">
                        <span role="img" aria-label="file">📄</span>
                        {item.fileName || item.name || 'ללא שם'}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-2 mt-1">
                        {item.recording_date && <span>📅 {item.recording_date}</span>}
                        <StatusBadge status={item.status} />
                        {item.note && <span>{item.note}</span>}
                        {item.client_name && <span>👤 {item.client_name}</span>}
                        {item.domain && <span>Domain: {item.domain}</span>}
                        {item.hash && <span className="text-slate-400">hash: {item.hash.slice(0, 8)}…</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="px-3 py-2 min-h-[44px] bg-slate-100 rounded-lg hover:bg-slate-200 text-sm"
                        onClick={() => openReviewer(item)}
                        data-testid={`rag.inbox.item.${itemId}.reviewer`}
                        data-action="inbox.item.openReviewer"
                      >
                        Review
                      </button>
                      <button
                        className="px-3 py-2 min-h-[44px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 text-sm"
                        onClick={() => handlePublish(item)}
                        data-testid={`rag.inbox.item.${itemId}.publish`}
                        data-action="inbox.item.publish"
                      >
                        Publish
                      </button>
                      <button
                        className="px-3 py-2 min-h-[44px] bg-rose-50 text-rose-700 border border-rose-100 rounded-lg hover:bg-rose-100 text-sm"
                        onClick={() => handleDelete(item)}
                        data-testid={`rag.inbox.item.${itemId}.delete`}
                        data-action="inbox.item.delete"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                )})}
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
                    <div className="flex items-center gap-3">
                      <button className="text-xs text-petrol underline" onClick={() => handleEditPublished(item)}>Edit</button>
                      <button
                        className="text-xs text-rose-600 underline"
                        onClick={() => handleDelete(item)}
                        title="Delete file and manifest entry"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

              {/* Zoom Cloud Recordings Section */}
              <SectionCard title="Zoom Cloud Recordings" testId="rag.zoomCloud">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setZoomCloudFilter('')} className={'px-3 py-1 rounded text-sm ' + (!zoomCloudFilter ? 'bg-petrol text-white' : 'bg-slate-100 text-slate-700')}>All</button>
                      <button type="button" onClick={() => setZoomCloudFilter('audio')} className={'px-3 py-1 rounded text-sm ' + (zoomCloudFilter === 'audio' ? 'bg-petrol text-white' : 'bg-slate-100 text-slate-700')}>Audio</button>
                      <button type="button" onClick={() => setZoomCloudFilter('video')} className={'px-3 py-1 rounded text-sm ' + (zoomCloudFilter === 'video' ? 'bg-petrol text-white' : 'bg-slate-100 text-slate-700')}>Video</button>
                    </div>
                    <button type="button" onClick={syncFromZoomCloud} className="px-4 py-2 rounded bg-petrol text-white hover:bg-petrol/90 text-sm font-medium" disabled={zoomCloudLoading} data-testid="rag.zoomCloud.sync">{zoomCloudLoading ? 'Syncing...' : 'Sync from Zoom'}</button>
                  </div>
                  {zoomCloudRecordings.length === 0 && !zoomCloudLoading && (<div className="text-xs text-slate-500">Click "Sync from Zoom" to load recordings.</div>)}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {zoomCloudRecordings.filter(rec => {
                      if (!zoomCloudFilter) return true
                      if (zoomCloudFilter === 'audio') return rec.file_type === 'M4A'
                      if (zoomCloudFilter === 'video') return rec.file_type === 'MP4'
                      return true
                    }).map((recording) => {
                      const badge = getZoomStatusBadge(recording.status)
                      const isAudio = recording.file_type === 'M4A'
                      return (
                        <div key={recording.zoom_id} className={'flex items-center justify-between text-sm border rounded-lg px-3 py-2 ' + (recording.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : recording.status === 'failed' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200')} data-testid={'rag.zoomCloud.item.' + recording.zoom_id}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={'px-2 py-0.5 rounded text-xs font-medium ' + (isAudio ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>{isAudio ? 'Audio' : 'Video'}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-800 truncate">{recording.topic || 'No title'}</div>
                              <div className="text-xs text-slate-500">{recording.date} | {recording.duration} min</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
                            {recording.status === 'in_zoom' && (
                              <>
                                <button onClick={() => downloadZoomRecording(recording)} className="px-3 py-1 bg-petrol text-white rounded text-sm hover:bg-petrol/90" disabled={downloadingId === recording.zoom_id} data-testid={'rag.zoomCloud.item.' + recording.zoom_id + '.download'}>{downloadingId === recording.zoom_id ? 'מוריד...' : 'הורד'}</button>
                                <button onClick={() => skipZoomRecording(recording)} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200" data-testid={'rag.zoomCloud.item.' + recording.zoom_id + '.skip'}>דלג</button>
                              </>
                            )}
                            {recording.status === 'completed' && (
                              <button onClick={() => transcribeZoomRecording(recording)} className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600" disabled={transcribingId === recording.zoom_id} data-testid={'rag.zoomCloud.item.' + recording.zoom_id + '.transcribe'}>{transcribingId === recording.zoom_id ? 'מתמלל...' : 'תמלל'}</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Activity Log Panel */}
                  {zoomCloudLog.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600">Activity Log</span>
                        <button onClick={() => setZoomCloudLog([])} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs max-h-32 overflow-y-auto">
                        {zoomCloudLog.map((log, i) => (
                          <div key={i} className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-blue-400'}>
                            [{log.time}] {log.msg}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Zoom Transcripts Section */}
              <div className="pt-4 border-t border-slate-200 space-y-2" data-testid="rag.zoomTranscripts">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">תמלולי זום אחרונים</div>
                  <button
                    type="button"
                    onClick={refreshZoomTranscripts}
                    className="px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs"
                    disabled={zoomStatus === "loading"}
                    data-testid="rag.zoomTranscripts.refresh"
                  >
                    {zoomStatus === "loading" ? "טוען..." : "רענן"}
                  </button>
                </div>
                {zoomStatus === "loading" && (
                  <div className="text-xs text-slate-500">טוען תמלולי זום...</div>
                )}
                {zoomTranscripts.length === 0 && zoomStatus !== "loading" && (
                  <div className="text-xs text-slate-500">לא נמצאו תמלולי זום.</div>
                )}
                {zoomTranscripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className="flex items-center justify-between text-sm border border-blue-200 rounded-lg px-3 py-2 bg-blue-50/50"
                    data-testid={`rag.zoomTranscripts.item.${transcript.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 flex items-center gap-2 truncate">
                        {importedZoomIds.has(transcript.id) && <span className="text-green-600">✓</span>}<span role="img" aria-label="zoom">📹</span>
                        {transcript.title || transcript.filename || "Zoom Recording"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {transcript.date || transcript.modified && new Date(transcript.date || transcript.modified).toLocaleDateString("he-IL")}
                        {transcript.size && ` · ${Math.round(transcript.size / 1024)} KB`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="px-3 py-2 min-h-[36px] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
                        onClick={() => downloadZoomTranscript(transcript)}
                        title="הורד קובץ"
                      >
                        ⬇️
                      </button>
                      <button
                        className="px-3 py-2 min-h-[36px] bg-white border border-rose-200 rounded-lg hover:bg-rose-50 text-rose-600 text-sm"
                        onClick={() => deleteZoomTranscript(transcript)}
                        title="מחק תמלול"
                      >
                        🗑️
                      </button>
                      <button
                        className="px-3 py-2 min-h-[36px] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
                        onClick={() => previewZoomTranscript(transcript)}
                        data-testid={`rag.zoomTranscripts.item.${transcript.id}.preview`}
                      >
                        תצוגה מקדימה
                      </button>
                      <button
                        className="px-3 py-2 min-h-[36px] bg-petrol text-white rounded-lg hover:bg-petrol/90 text-sm"
                        onClick={() => importZoomToRag(transcript)}
                        disabled={zoomImporting}
                        data-testid={`rag.zoomTranscripts.item.${transcript.id}.import`}
                      >
                        {zoomImporting ? "מייבא..." : "ייבא ל-RAG"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Zoom Preview Modal */}
              {zoomPreview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setZoomPreview(null)}>
                  <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                      <div className="font-semibold text-slate-800">{zoomPreview.filename}</div>
                      <button
                        className="text-slate-500 hover:text-slate-700 text-xl"
                        onClick={() => setZoomPreview(null)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid md:grid-cols-[250px_1fr] gap-4 p-4">
                      {/* Metadata fields */}
                      <div className="space-y-3 border-l border-slate-200 pl-4" dir="rtl">
                        <div className="text-sm font-semibold text-slate-700">פרטי ייבוא</div>
                        <label className="block text-sm">
                          <span className="text-slate-600">לקוח:</span>
                          <div className="mt-1 relative">
                            <input
                              type="text"
                              list="clients-list"
                              className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                              value={zoomImportMeta.client}
                              onChange={(e) => setZoomImportMeta(prev => ({...prev, client: e.target.value}))}
                              placeholder={clientsLoading ? "טוען לקוחות..." : "בחר או הקלד שם לקוח"}
                            />
                            <datalist id="clients-list">
                              {availableClients.map((name, idx) => (
                                <option key={idx} value={name} />
                              ))}
                            </datalist>
                          </div>
                          {availableClients.length > 0 && (
                            <span className="text-xs text-slate-400">{availableClients.length} לקוחות זמינים</span>
                          )}
                        </label>
                        <label className="block text-sm">
                          <span className="text-slate-600">תאריך:</span>
                          <input
                            type="date"
                            className="mt-1 w-full border border-slate-200 rounded px-2 py-1 text-sm"
                            value={zoomImportMeta.date}
                            onChange={(e) => setZoomImportMeta(prev => ({...prev, date: e.target.value}))}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-slate-600">דומיין:</span>
                          <select
                            className="mt-1 w-full border border-slate-200 rounded px-2 py-1 text-sm"
                            value={zoomImportMeta.domain}
                            onChange={(e) => setZoomImportMeta(prev => ({...prev, domain: e.target.value}))}
                          >
                            <option value="Client_Work">Client_Work</option>
                            <option value="Business_Ops">Business_Ops</option>
                            <option value="Personal">Personal</option>
                          </select>
                        </label>
                      </div>
                      {/* Transcript content */}
                      <div className="overflow-y-auto max-h-[50vh]">
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed" dir="rtl">
                          {zoomPreview.content}
                        </pre>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
                      <button
                        className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm"
                        onClick={() => downloadZoomTranscript(zoomPreview)}
                      >
                        הורד קובץ
                      </button>
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm"
                          onClick={() => setZoomPreview(null)}
                        >
                          סגור
                        </button>
                        <button
                          className="px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 text-sm"
                          onClick={() => importZoomToRag(zoomPreview)}
                          disabled={zoomImporting || importedZoomIds.has(zoomPreview.id)}
                        >
                          {importedZoomIds.has(zoomPreview.id) ? "✓ יובא" : zoomImporting ? "מייבא..." : "ייבא ל-RAG"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </SectionCard>

          {reviewItem && (
            <SectionCard
              ref={reviewerRef}
              testId="rag.reviewer"
              title={`Reviewer — ${reviewItem.fileName || reviewItem.id}`}
              subtitle="Click any chat bubble to play audio from that timestamp"
              footer={
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Status: {reviewItem.status || 'draft'}</span>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 min-h-[44px] rounded-lg bg-petrol text-white text-sm hover:bg-petrol/90"
                      onClick={() => {
                        setReviewItem((prev) => ({ ...prev, status: 'ready' }))
                        saveReviewer()
                      }}
                      disabled={reviewSaving}
                      data-testid="rag.reviewer.savePublish"
                      data-action="reviewer.savePublish"
                    >
                      {reviewSaving ? 'Saving…' : 'Save & Publish'}
                    </button>
                    <button
                      className="px-4 py-2 min-h-[44px] rounded-lg bg-slate-100 text-sm hover:bg-slate-200"
                      onClick={() => setReviewItem(null)}
                      data-testid="rag.reviewer.close"
                    >
                      Close
                    </button>
                  </div>
                </div>
              }
            >
              <div className="grid md:grid-cols-[280px_1fr] gap-4">
                {/* Metadata sidebar */}
                <div className="space-y-3" data-testid="rag.reviewer.metadata">
                  <LabeledField label="Date">
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm min-h-[44px]"
                      value={reviewItem.date || ''}
                      onChange={(e) => setReviewItem((prev) => ({ ...prev, date: e.target.value }))}
                      data-testid="rag.reviewer.date"
                    />
                  </LabeledField>
                  <LabeledField label="Domain">
                    <input
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm min-h-[44px]"
                      value={reviewItem.domain || ''}
                      onChange={(e) => setReviewItem((prev) => ({ ...prev, domain: e.target.value }))}
                      placeholder="CLIENT_WORK / INTERNAL"
                      data-testid="rag.reviewer.domain"
                    />
                  </LabeledField>
                  <LabeledField label="Client">
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm min-h-[44px]"
                      value={reviewItem.client_id || ''}
                      onChange={(e) => {
                        const selected = availableClients.find(c => c.id === e.target.value)
                        setReviewItem((prev) => ({
                          ...prev,
                          client_id: e.target.value,
                          client_name: selected?.name || ''
                        }))
                      }}
                      data-testid="rag.reviewer.client"
                    >
                      <option value="">-- Select Client --</option>
                      {availableClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </LabeledField>
                  <LabeledField label="Tags">
                    <input
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm min-h-[44px]"
                      value={reviewItem.tags || ''}
                      onChange={(e) => setReviewItem((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder="comma separated"
                      data-testid="rag.reviewer.tags"
                    />
                  </LabeledField>
                  <LabeledField label="Audio Player">
                    <audio
                      ref={audioRef}
                      className="w-full"
                      controls
                      src={`${apiBase || ''}/api/rag/audio/${reviewItem.id}`}
                      data-testid="rag.reviewer.audio"
                    >
                      Your browser does not support audio playback.
                    </audio>
                    <p className="text-xs text-slate-400 mt-1">Click a bubble below to jump to timestamp</p>
                  </LabeledField>
                  <LabeledField label="Rename speaker (global)">
                    <div className="flex gap-2">
                      <input
                        className="border border-slate-200 rounded px-2 py-2 text-sm flex-1 min-h-[44px]"
                        placeholder="From"
                        value={renameFrom}
                        onChange={(e) => setRenameFrom(e.target.value)}
                        data-testid="rag.reviewer.renameFrom"
                      />
                      <input
                        className="border border-slate-200 rounded px-2 py-2 text-sm flex-1 min-h-[44px]"
                        placeholder="To"
                        value={renameTo}
                        onChange={(e) => setRenameTo(e.target.value)}
                        data-testid="rag.reviewer.renameTo"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 min-h-[44px] bg-slate-100 rounded text-sm hover:bg-slate-200"
                        onClick={() => {
                          if (!renameFrom || !renameTo) return
                          const next = (reviewItem.transcript || []).map((seg) => ({
                            ...seg,
                            speaker: seg.speaker === renameFrom ? renameTo : seg.speaker,
                          }))
                          setReviewItem((prev) => ({ ...prev, transcript: next }))
                        }}
                        data-testid="rag.reviewer.renameApply"
                        data-action="reviewer.renameSpeaker"
                      >
                        Apply
                      </button>
                    </div>
                  </LabeledField>
                </div>

                {/* Chat-style transcript view */}
                <div className="space-y-3" data-testid="rag.reviewer.transcript">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-slate-700">Transcript ({(reviewItem.transcript || []).length} segments)</div>
                    <div className="flex items-center gap-2">
                      {reviewItem?.rawText && (
                        <button
                          type="button"
                          className="px-3 py-2 min-h-[44px] text-sm text-slate-600 hover:text-slate-800 bg-slate-50 rounded-lg"
                          onClick={() => {
                            const lines = (reviewItem.rawText || '')
                              .split(/\r?\n/)
                              .map((l) => l.trim())
                              .filter(Boolean)
                            const segs = lines.map((text) => ({
                              speaker: '',
                              start: '',
                              end: '',
                              text,
                            }))
                            setReviewItem((prev) => ({ ...prev, transcript: segs }))
                          }}
                          data-testid="rag.reviewer.loadRaw"
                          data-action="reviewer.loadRaw"
                        >
                          Load raw text
                        </button>
                      )}
                      <button
                        type="button"
                        className="px-3 py-2 min-h-[44px] text-sm text-petrol bg-petrol/10 rounded-lg hover:bg-petrol/20"
                        onClick={() =>
                          setReviewItem((prev) => ({
                            ...prev,
                            transcript: [...(prev?.transcript || []), { speaker: '', start: '', end: '', text: '' }],
                          }))
                        }
                        data-testid="rag.reviewer.addSegment"
                        data-action="reviewer.addSegment"
                      >
                        + Add segment
                      </button>
                    </div>
                  </div>

                  {/* Chat bubbles container - WhatsApp style per PRD */}
                  <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl p-4 max-h-[600px] overflow-y-auto" data-testid="rag.reviewer.chatContainer">
                    {(reviewItem.transcript || []).length === 0 && (
                      <div className="text-center text-slate-500 py-8">
                        No segments yet. Click "Add segment" or "Load raw text" to begin.
                      </div>
                    )}
                    {(reviewItem.transcript || []).map((seg, idx) => (
                      <ChatBubble
                        key={idx}
                        segment={seg}
                        index={idx}
                        isEven={idx % 2 === 0}
                        audioRef={audioRef}
                        onTextChange={(i, text) => {
                          const next = [...(reviewItem.transcript || [])]
                          next[i] = { ...next[i], text }
                          setReviewItem((prev) => ({ ...prev, transcript: next }))
                        }}
                        onSpeakerChange={(i, speaker) => {
                          const next = [...(reviewItem.transcript || [])]
                          next[i] = { ...next[i], speaker }
                          setReviewItem((prev) => ({ ...prev, transcript: next }))
                        }}
                        onDelete={(i) => {
                          const next = [...(reviewItem.transcript || [])]
                          next.splice(i, 1)
                          setReviewItem((prev) => ({ ...prev, transcript: next }))
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}
          </>
          )}
        </div>
        <aside className="w-64 space-y-3" data-testid="rag.sidebar">
          <div className="text-sm font-semibold text-slate-700">ניווט</div>
          <nav className="space-y-2" role="tablist" aria-label="RAG navigation">
            <button
              role="tab"
              aria-selected={activeTab === 'ingest'}
              className={`w-full border rounded-lg px-4 py-3 text-sm min-h-[44px] transition-colors ${activeTab === 'ingest' ? 'border-petrol text-petrol bg-petrol/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('ingest')}
              data-testid="rag.tab.ingest"
              data-action="tab.switch.ingest"
            >
              קליטה ואישור
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'assistant'}
              className={`w-full border rounded-lg px-4 py-3 text-sm min-h-[44px] transition-colors ${activeTab === 'assistant' ? 'border-petrol text-petrol bg-petrol/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('assistant')}
              data-testid="rag.tab.assistant"
              data-action="tab.switch.assistant"
            >
              עוזר AI
            </button>
          </nav>
        </aside>
      </div>
      {activeTab === 'assistant' && assistantAnswer === '' && assistantStatus === 'idle' && (
        <div className="text-xs text-slate-500 px-2">API Host: {apiBase || 'n/a'}</div>
      )}
    </div>
  )
}
