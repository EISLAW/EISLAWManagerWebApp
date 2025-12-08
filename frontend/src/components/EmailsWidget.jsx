import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Paperclip, RefreshCcw, Loader2, X, Reply, ExternalLink, Download } from 'lucide-react'
import { getStoredApiBase } from '../utils/apiBase'

/**
 * Format relative time in Hebrew
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'עכשיו'
  if (diffMinutes < 60) return `לפני ${diffMinutes} דק׳`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `לפני ${diffHours} שע׳`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'אתמול'
  if (diffDays < 7) return `לפני ${diffDays} ימים`

  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

/**
 * Check if email appears unread based on metadata
 */
function isUnread(email) {
  if (email.isRead === false) return true
  if (email.is_read === false) return true
  return false
}

/**
 * Compact email list widget for client overview
 * Always scrollable - shows 5 emails height, scroll to see all
 */
export default function EmailsWidget({ clientName }) {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [total, setTotal] = useState(0)
  const [viewer, setViewer] = useState({ open: false, loading: false, error: '', html: '', meta: {} })
  const [savingAttachments, setSavingAttachments] = useState(false)
  const [saveToast, setSaveToast] = useState({ show: false, message: '', tone: 'success' })
  const toastTimer = useRef(null)

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  }, [])

  const encodedName = useMemo(() => encodeURIComponent(clientName), [clientName])

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }
    }
  }, [])

  function showSaveToast(message, tone = 'success') {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
    }
    setSaveToast({ show: true, message, tone })
    toastTimer.current = setTimeout(() => setSaveToast({ show: false, message: '', tone }), 4000)
  }

  // Fetch all emails (up to 100)
  async function fetchEmails() {
    if (!API) return
    setLoading(true)
    try {
      const r = await fetch(`${API}/email/by_client?name=${encodedName}&limit=100&offset=0`)
      if (r.ok) {
        const data = await r.json()
        setEmails(data.items || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.warn('EmailsWidget fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function syncEmails() {
    if (!API || syncing) return
    setSyncing(true)
    try {
      const r = await fetch(`${API}/email/sync_client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clientName, since_days: 45 })
      })
      if (r.ok) {
        await fetchEmails()
      }
    } catch (err) {
      console.warn('EmailsWidget sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchEmails()
  }, [clientName, API])

  const unreadCount = emails.filter(isUnread).length

  // Show email content inline
  async function showEmailInline(item) {
    if (!item?.id) return
    const hasAttachments = item.has_attachments || Number(item.attachments_count || 0) > 0
    const attachmentsCount = Number(item.attachments_count || 0)
    setViewer({
      open: true,
      loading: true,
      error: '',
      html: '',
      meta: {
        id: item.id,
        subject: item.subject || '',
        from: item.from || '',
        received: item.received || '',
        has_attachments: hasAttachments,
        attachments_count: attachmentsCount
      }
    })
    try {
      const params = new URLSearchParams({ id: item.id, client: clientName })
      const res = await fetch(`${API}/email/content?${params.toString()}`)
      if (!res.ok) {
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
          received: data.received || item.received || '',
          has_attachments: hasAttachments,
          attachments_count: attachmentsCount
        }
      })
    } catch (err) {
      setViewer(v => ({
        ...v,
        loading: false,
        error: 'Unable to load email. ' + (err?.message || '')
      }))
    }
  }

  function closeViewer() {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
    }
    setSaveToast({ show: false, message: '', tone: 'success' })
    setViewer({ open: false, loading: false, error: '', html: '', meta: {} })
  }

  // Open in Outlook
  async function openEmailInOutlook(item) {
    if (!item?.id) return
    try {
      const res = await fetch(`${API}/email/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.link) {
          window.open(data.link, '_blank')
        }
      }
    } catch (err) {
      console.error('openEmailInOutlook', err)
    }
  }

  // Reply in Outlook
  async function replyInOutlook(item) {
    if (!item?.id) return
    try {
      const res = await fetch(`${API}/email/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.link) {
          window.open(data.link, '_blank')
        }
      }
    } catch (err) {
      console.error('replyInOutlook', err)
    }
  }

  const viewerHasAttachments = viewer?.meta?.has_attachments || Number(viewer?.meta?.attachments_count || 0) > 0

  async function saveAttachmentsToSharePoint() {
    if (!API || !viewer?.meta?.id || savingAttachments) return
    setSavingAttachments(true)
    try {
      const res = await fetch(`${API}/api/email/attachments/save-to-sharepoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: viewer.meta.id, client_name: clientName })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        const count = Number(data.count || 0)
        if (count === 0) {
          showSaveToast(data?.message || 'לא נמצאו קבצים באימייל', 'warn')
        } else {
          showSaveToast(`נשמרו ${count} קבצים ל-SharePoint`, 'success')
        }
      } else {
        const errorCode = data?.error
        if (errorCode === 'no_sharepoint_folder') {
          showSaveToast('לא הוגדרה תיקיית SharePoint ללקוח', 'error')
        } else if (errorCode === 'invalid_sharepoint_folder') {
          showSaveToast('לא נמצאה תיקיית היעד ב-SharePoint', 'error')
        } else if (data?.message === 'Email has no attachments') {
          showSaveToast('לאימייל זה אין קבצים מצורפים', 'warn')
        } else {
          showSaveToast(data?.message || 'שמירת הקבצים נכשלה', 'error')
        }
      }
    } catch (err) {
      showSaveToast('שמירת הקבצים נכשלה', 'error')
    } finally {
      setSavingAttachments(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="emails-widget">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">אימיילים</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-petrol text-white rounded-full">
                {unreadCount}
              </span>
            )}
            {total > 0 && (
              <span className="text-xs text-slate-400">({total})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="p-1 text-slate-400 hover:text-petrol transition-colors disabled:opacity-50"
              title="סנכרן מיילים"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
            </button>
            <Link
              to={`/clients/${encodedName}?tab=emails`}
              className="text-xs text-petrol hover:underline flex items-center gap-1"
            >
              הצג הכל <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Always scrollable - fixed height for ~5 emails, scroll to see all */}
        <div className="max-h-[400px] overflow-y-auto divide-y">
          {loading && (
            <div className="p-4 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              טוען...
            </div>
          )}

          {!loading && emails.length === 0 && (
            <div className="p-4 text-sm text-slate-500 text-center">
              אין אימיילים עדיין
            </div>
          )}

          {!loading && emails.map(email => {
            const unread = isUnread(email)
            const hasAttachments = email.has_attachments || Number(email.attachments_count || 0) > 0
            const senderName = (email.from || '').split(/[<]/)[0].trim() || 'Unknown'
            const relativeTime = formatRelativeTime(email.received)

            return (
              <div
                key={email.id}
                className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer ${unread ? 'bg-blue-50/30' : ''}`}
                onClick={() => showEmailInline(email)}
                data-testid={`email-row-${email.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator */}
                  <div className="shrink-0 pt-1.5">
                    {unread && (
                      <span className="block w-2 h-2 rounded-full bg-petrol" title="לא נקרא" />
                    )}
                    {!unread && <span className="block w-2 h-2" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {senderName}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {relativeTime}
                      </span>
                      {hasAttachments && (
                        <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <div className={`text-sm truncate ${unread ? 'text-slate-700' : 'text-slate-500'}`}>
                      {email.subject || '(ללא נושא)'}
                    </div>
                    {email.preview && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {email.preview.slice(0, 80)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Email Viewer Modal */}
      {viewer.open && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6 flex items-start justify-center overflow-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200">
            {saveToast.show && (
              <div
                className={`absolute top-3 right-4 px-3 py-2 rounded-lg border text-sm shadow-sm ${
                  saveToast.tone === 'error'
                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                    : saveToast.tone === 'warn'
                      ? 'bg-amber-50 border-amber-100 text-amber-800'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}
              >
                {saveToast.message}
              </div>
            )}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-base font-semibold text-petrol">{viewer.meta.subject || 'אימייל'}</div>
                <div className="text-xs text-slate-500">
                  {viewer.meta.from && <span>מאת: {viewer.meta.from}</span>}
                  {viewer.meta.received && <span className="mr-2">התקבל: {viewer.meta.received}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 text-sm text-petrol hover:underline min-h-[44px] px-2 disabled:opacity-50"
                  onClick={saveAttachmentsToSharePoint}
                  disabled={!viewerHasAttachments || savingAttachments}
                  data-testid="email.saveToSharePoint"
                >
                  {savingAttachments ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {savingAttachments ? 'שומר...' : 'שמור קבצים ל-SharePoint'}
                </button>
                <button
                  className="flex items-center gap-1 text-sm text-petrol hover:underline min-h-[44px] px-2"
                  onClick={() => {
                    if (viewer.meta.id) {
                      openEmailInOutlook({ id: viewer.meta.id })
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  פתח ב-Outlook
                </button>
                <button
                  className="flex items-center gap-1 text-sm text-petrol hover:underline min-h-[44px] px-2"
                  onClick={() => {
                    if (viewer.meta.id) {
                      replyInOutlook({ id: viewer.meta.id })
                    }
                  }}
                >
                  <Reply className="w-4 h-4" />
                  השב
                </button>
                <button
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm min-h-[44px] hover:bg-slate-200"
                  onClick={closeViewer}
                >
                  <X className="w-4 h-4" />
                  סגור
                </button>
              </div>
            </div>
            <div className="p-4 min-h-[400px]">
              {viewer.loading && (
                <div className="flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> טוען אימייל…
                </div>
              )}
              {!viewer.loading && viewer.error && (
                <div className="rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{viewer.error}</div>
              )}
              {!viewer.loading && !viewer.error && viewer.html && viewer.html.replace(/<[^>]*>/g, '').trim().length > 10 && (
                <iframe
                  title="תוכן האימייל"
                  className="w-full h-[70vh] border rounded"
                  sandbox="allow-same-origin"
                  srcDoc={viewer.html}
                />
              )}
              {!viewer.loading && !viewer.error && (!viewer.html || viewer.html.replace(/<[^>]*>/g, '').trim().length <= 10) && (
                <div className="text-center text-slate-500 py-8">
                  <p className="text-lg mb-2">📎 אימייל זה מכיל רק קובץ מצורף</p>
                  <p className="text-sm">לחץ על "פתח ב-Outlook" לצפייה בקובץ</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
