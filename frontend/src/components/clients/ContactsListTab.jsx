import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, Search } from 'lucide-react'
import { detectApiBase, getStoredApiBase, setStoredApiBase } from '../../utils/apiBase.js'
import ActivateContactModal from './ActivateContactModal.jsx'
import ContactRow from './ContactRow.jsx'
import SyncButton from './SyncButton.jsx'

export default function ContactsListTab({ onActivateContact, onViewClient }) {
  const envApi = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [apiBase, setApiBase] = useState(() => getStoredApiBase() || envApi || '')
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [lastSync, setLastSync] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [activating, setActivating] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', tone: 'success' })

  const ensureApiBase = useCallback(async () => {
    if (apiBase) return apiBase
    const detected = await detectApiBase([envApi])
    if (detected) {
      setApiBase(detected)
      setStoredApiBase(detected)
      return detected
    }
    return ''
  }, [apiBase, envApi])

  const loadContacts = useCallback(async () => {
    const base = await ensureApiBase()
    if (!base) {
      setError('ה-API לא זמין. בדוק שהשרת פועל.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${base}/api/airtable-contacts`)
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setContacts(Array.isArray(data.contacts) ? data.contacts : [])
      setLastSync(data.last_sync || '')
    } catch (err) {
      console.error('load contacts failed', err)
      setError('טעינת רשימת הקשר נכשלה.')
    } finally {
      setLoading(false)
    }
  }, [ensureApiBase])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts
    const q = search.toLowerCase().trim()
    return contacts.filter((c) => {
      if ((c.name || '').toLowerCase().includes(q)) return true
      if ((c.email || '').toLowerCase().includes(q)) return true
      if ((c.phone || '').toLowerCase().includes(q)) return true
      return false
    })
  }, [contacts, search])

  const formatDate = (value) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString('he-IL')
  }

  const handleSync = useCallback(async () => {
    const base = await ensureApiBase()
    if (!base) {
      setToast({ show: true, message: 'לא נמצא שרת API לסנכרון.', tone: 'error' })
      return
    }
    setSyncing(true)
    setToast({ show: false, message: '', tone: 'success' })
    try {
      const res = await fetch(`${base}/api/sync/pull-airtable`, { method: 'POST' })
      if (!res.ok) throw new Error('sync failed')
      const data = await res.json()
      setLastSync(data.synced_at || new Date().toISOString())
      await loadContacts()
      setToast({ show: true, message: 'סנכרון הושלם בהצלחה.', tone: 'success' })
    } catch (err) {
      console.error('sync failed', err)
      setToast({ show: true, message: 'סנכרון נכשל. בדוק חיבור ונתונים.', tone: 'error' })
    } finally {
      setSyncing(false)
    }
  }, [ensureApiBase, loadContacts])

  const handleActivate = useCallback(
    async ({ createFolder, folderPath }) => {
      if (!selectedContact) return
      const base = await ensureApiBase()
      if (!base) {
        setToast({ show: true, message: 'לא נמצא שרת API ליצירת לקוח.', tone: 'error' })
        return
      }
      setActivating(true)
      setToast({ show: false, message: '', tone: 'success' })

      let sharepointUrl = folderPath

      try {
        // Step 1: Create SharePoint folder if requested
        if (createFolder) {
          const folderRes = await fetch(`${base}/sp/folder_create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: selectedContact.name }),
          })
          if (folderRes.ok) {
            const folderData = await folderRes.json()
            sharepointUrl = folderData.webUrl
          } else {
            console.warn('SharePoint folder creation failed, continuing without folder')
          }
        }

        // Step 2: Activate contact and create client
        const res = await fetch(`${base}/api/contacts/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            airtable_contact_id: selectedContact.id,
            sharepoint_folder: sharepointUrl,
          }),
        })
        if (!res.ok) throw new Error('activate failed')
        const data = await res.json()
        setContacts((prev) =>
          prev.map((c) =>
            c.id === selectedContact.id
              ? { ...c, activated: true, client_id: data.client?.id, activated_at: new Date().toISOString() }
              : c
          )
        )
        onActivateContact?.({ contact: selectedContact, client: data.client })

        const successMsg = sharepointUrl
          ? 'הלקוח נוצר בהצלחה עם תיקיית SharePoint.'
          : 'הלקוח נוצר בהצלחה.'
        setToast({ show: true, message: successMsg, tone: 'success' })
        setSelectedContact(null)
      } catch (err) {
        console.error('activate failed', err)
        setToast({ show: true, message: 'ההפעלה נכשלה. נסה שוב.', tone: 'error' })
      } finally {
        setActivating(false)
      }
    },
    [ensureApiBase, onActivateContact, selectedContact]
  )

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <SyncButton onSync={handleSync} lastSyncTime={formatDate(lastSync)} syncing={syncing} disabled={loading} />
        <div className="relative w-full lg:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            className="w-full pr-10 pl-10 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
          />
        </div>
      </div>

      {toast.show && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            toast.tone === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="card overflow-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-slate-600 px-1">
          <span>{filteredContacts.length ? `הוצגו ${filteredContacts.length} אנשי קשר` : 'אין אנשי קשר להצגה'}</span>
          <span>עודכן לאחרונה: {formatDate(lastSync)}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-600 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>טוען רשימת קשר...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-sm text-slate-600 py-6 text-center">אין תוצאות תואמות לחיפוש.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-600 border-b">
                <th className="p-3 w-1/3">שם</th>
                <th className="p-3 w-1/5">טלפון</th>
                <th className="p-3 w-1/5">סטטוס</th>
                <th className="p-3 w-1/5 text-left md:text-right">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <ContactRow
                  key={contact.id || contact.airtable_id}
                  contact={contact}
                  activating={activating && selectedContact?.id === contact.id}
                  onActivate={() => setSelectedContact(contact)}
                  onView={() => onViewClient?.(contact)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedContact && (
        <ActivateContactModal
          contact={selectedContact}
          onConfirm={handleActivate}
          onCancel={() => setSelectedContact(null)}
          loading={activating}
        />
      )}
    </div>
  )
}
