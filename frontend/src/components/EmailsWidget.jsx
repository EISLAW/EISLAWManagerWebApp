import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Paperclip, RefreshCcw, Loader2 } from 'lucide-react'
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
  // If backend provides isRead flag, use it
  if (email.isRead === false) return true
  if (email.is_read === false) return true
  // Otherwise, default to false
  return false
}

/**
 * Compact email list widget for client overview
 */
export default function EmailsWidget({ clientName, clientEmails = [], limit = 5, onEmailClick }) {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [total, setTotal] = useState(0)

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  }, [])

  const encodedName = useMemo(() => encodeURIComponent(clientName), [clientName])

  async function fetchEmails() {
    if (!API) return
    setLoading(true)
    try {
      const r = await fetch(`${API}/email/by_client?name=${encodedName}&limit=${limit}&offset=0`)
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

  const hasMore = total > limit
  const unreadCount = emails.filter(isUnread).length

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="emails-widget">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">אימיילים</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-petrol text-white rounded-full">
              {unreadCount}
            </span>
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

      <div className="divide-y max-h-[500px] overflow-y-auto">
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
              onClick={() => onEmailClick && onEmailClick(email)}
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

      {hasMore && !loading && (
        <div className="border-t px-4 py-2 text-center">
          <Link
            to={`/clients/${encodedName}?tab=emails`}
            className="text-xs text-slate-500 hover:text-petrol"
          >
            +{total - limit} אימיילים נוספים
          </Link>
        </div>
      )}
    </div>
  )
}
