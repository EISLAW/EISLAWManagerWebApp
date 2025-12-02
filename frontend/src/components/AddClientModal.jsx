import React, { useEffect, useMemo, useState } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// Hebrew Labels & Options
// ═══════════════════════════════════════════════════════════════════════════
const LABELS = {
  modalTitle: 'הוסף לקוח',
  modalTitleEdit: 'עריכת לקוח',
  searchPlaceholder: 'הקלד שם לקוח לחיפוש או יצירה...',
  searchHint: 'החיפוש מתבצע ב-Airtable. אם לא נמצא - תוכל ליצור לקוח חדש.',
  noResults: 'לא נמצאו תוצאות',
  createNew: 'צור לקוח חדש',
  createHint: 'הלקוח יסונכרן אוטומטית ל-Airtable',
  selectExisting: 'בחר לקוח קיים',
  clientName: 'שם לקוח',
  email: 'אימייל',
  emailHint: 'מספר אימיילים מופרדים בפסיק',
  phone: 'טלפון',
  clientType: 'סוג לקוח',
  stage: 'סטטוס',
  notes: 'הערות',
  folder: 'תיקייה',
  folderBrowse: 'עיין',
  folderLinking: 'מקשר...',
  folderNotLinked: 'לא מקושר',
  folderLinked: 'מקושר',
  cancel: 'ביטול',
  submit: 'הוסף לקוח',
  submitEdit: 'שמור שינויים',
  submitting: 'שומר...',
  duplicateWarning: 'לקוח עם שם דומה כבר קיים',
  syncPending: 'ממתין לסנכרון',
  syncSuccess: 'סונכרן בהצלחה',
  required: 'שדה חובה',
  searching: 'מחפש...',
  airtableId: 'מזהה Airtable',
  contacts: 'אנשי קשר',
}

const CLIENT_TYPES = [
  { value: 'בטיפול', label: 'בטיפול' },
  { value: 'ריטיינר', label: 'ריטיינר' },
  { value: 'ליטיגציה', label: 'ליטיגציה' },
  { value: 'טיפול הושלם', label: 'טיפול הושלם' },
  { value: 'פוטנציאלי', label: 'פוטנציאלי' },
]

const STAGES = [
  { value: '', label: 'לא נבחר' },
  { value: 'חדש', label: 'חדש' },
  { value: 'בתהליך', label: 'בתהליך' },
  { value: 'ממתין', label: 'ממתין' },
  { value: 'הושלם', label: 'הושלם' },
]

const folderPills = {
  idle: { label: LABELS.folderNotLinked, className: 'bg-slate-100 text-slate-600' },
  not_linked: { label: LABELS.folderNotLinked, className: 'bg-slate-100 text-slate-600' },
  linking: { label: LABELS.folderLinking, className: 'bg-amber-50 text-amber-700' },
  linked: { label: LABELS.folderLinked, className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  error: { label: 'שגיאה', className: 'bg-red-50 text-red-700' },
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════
function normalizeSeedRecords(records = []) {
  if (!Array.isArray(records)) return []
  return records
    .map((item) => {
      const name = item.display_name || item.name || item.client_name || ''
      if (!name) return null
      const emailList = Array.isArray(item.emails)
        ? item.emails
        : item.email
        ? [item.email]
        : []
      return {
        id: item.airtable_id || item.id || name,
        name,
        emails: emailList,
        phone: item.phone || '',
        client_type: item.client_type || [],
        status: item.stage || '',
        notes: item.notes || '',
        contacts: item.contacts || [],
        airtable_url: item.airtable_url || '',
      }
    })
    .filter(Boolean)
}

function parseEmails(input = '') {
  return input.split(',').map((part) => part.trim()).filter(Boolean)
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export default function AddClientModal({
  apiBase,
  envApi,
  onClose,
  onAdded,
  seedClients = [],
  initialQuery = '',
  mode = 'create',
  initialClient = null,
}) {
  const API = useMemo(
    () => (apiBase || envApi || 'http://127.0.0.1:8788').replace(/\/$/, ''),
    [apiBase, envApi]
  )

  const isEditMode = mode === 'edit'

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchStatus, setSearchStatus] = useState('idle') // idle | searching | ready | empty | error
  const [searchResults, setSearchResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [isCreateMode, setIsCreateMode] = useState(false) // Smart Flow: true = create new, false = select existing

  const [formData, setFormData] = useState({
    name: '',
    emailsText: '',
    phone: '',
    clientTypes: [],
    stage: '',
    notes: '',
  })

  const [folder, setFolder] = useState({ path: '', status: 'not_linked', message: '' })
  const [submitStatus, setSubmitStatus] = useState('idle') // idle | submitting | success | error
  const [submitError, setSubmitError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Derived Values
  // ─────────────────────────────────────────────────────────────────────────
  const parsedEmails = useMemo(() => parseEmails(formData.emailsText), [formData.emailsText])
  const currentFolderPill = folderPills[folder.status] || folderPills.not_linked

  const canSubmit = useMemo(() => {
    if (submitStatus === 'submitting') return false
    if (!formData.name.trim()) return false
    if (parsedEmails.length === 0) return false
    return true
  }, [submitStatus, formData.name, parsedEmails])

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = originalOverflow }
  }, [])

  // Initialize from existing client (edit mode)
  useEffect(() => {
    if (initialClient) {
      const normalized = normalizeSeedRecords([initialClient])[0]
      if (normalized) {
        setSelectedClient(normalized)
        setFormData({
          name: normalized.name || '',
          emailsText: (normalized.emails || []).join(', '),
          phone: normalized.phone || '',
          clientTypes: normalized.client_type || [],
          stage: normalized.status || '',
          notes: normalized.notes || '',
        })
        setSearchQuery(normalized.name || '')
      }
    }
  }, [initialClient])

  // Smart Search with debounce
  useEffect(() => {
    if (isEditMode) return
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchStatus('idle')
      setIsCreateMode(false)
      setDuplicateWarning(null)
      return
    }

    setSearchStatus('searching')
    setDuplicateWarning(null)
    const controller = new AbortController()

    const handle = setTimeout(async () => {
      try {
        // Search in Airtable
        const endpoint = `${API}/airtable/search?q=${encodeURIComponent(searchQuery.trim())}`
        const res = await fetch(endpoint, { signal: controller.signal })

        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const normalized = normalizeSeedRecords(items)

        setSearchResults(normalized)

        if (normalized.length === 0) {
          setSearchStatus('empty')
          setIsCreateMode(true) // Auto-switch to create mode
          // Pre-fill form with search query
          setFormData(prev => ({ ...prev, name: searchQuery.trim() }))
        } else {
          setSearchStatus('ready')
          setIsCreateMode(false)
          // Check for potential duplicate
          const exactMatch = normalized.find(c =>
            c.name.toLowerCase() === searchQuery.trim().toLowerCase()
          )
          if (exactMatch) {
            setDuplicateWarning(exactMatch)
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return

        // Fallback to local seed clients
        const fallback = (seedClients || []).filter((c) => {
          const name = (c.name || '').toLowerCase()
          const emails = (c.emails || []).join(' ').toLowerCase()
          const q = searchQuery.toLowerCase()
          return name.includes(q) || emails.includes(q)
        })
        const normalized = normalizeSeedRecords(fallback)
        setSearchResults(normalized)

        if (normalized.length === 0) {
          setSearchStatus('empty')
          setIsCreateMode(true)
          setFormData(prev => ({ ...prev, name: searchQuery.trim() }))
        } else {
          setSearchStatus('error')
          setIsCreateMode(false)
        }
      }
    }, 350)

    return () => {
      clearTimeout(handle)
      controller.abort()
    }
  }, [API, searchQuery, seedClients, isEditMode])

  // When selecting existing client, populate form
  useEffect(() => {
    if (selectedClient && !isCreateMode) {
      setFormData({
        name: selectedClient.name || '',
        emailsText: (selectedClient.emails || []).join(', '),
        phone: selectedClient.phone || '',
        clientTypes: selectedClient.client_type || [],
        stage: selectedClient.status || '',
        notes: selectedClient.notes || '',
      })
    }
  }, [selectedClient, isCreateMode])

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleClientType = (type) => {
    setFormData(prev => ({
      ...prev,
      clientTypes: prev.clientTypes.includes(type)
        ? prev.clientTypes.filter(t => t !== type)
        : [...prev.clientTypes, type]
    }))
  }

  const handleSelectClient = (client) => {
    setSelectedClient(client)
    setIsCreateMode(false)
    setDuplicateWarning(null)
  }

  const handleSwitchToCreate = () => {
    setSelectedClient(null)
    setIsCreateMode(true)
    setFormData(prev => ({ ...prev, name: searchQuery.trim() }))
  }

  const handleBrowseFolder = async () => {
    if (!formData.name.trim()) {
      setFolder({ path: '', status: 'error', message: 'הזן שם לקוח תחילה' })
      return
    }

    setFolder(s => ({ ...s, status: 'linking', message: '' }))

    try {
      const res = await fetch(`${API}/dev/open_folder?name=${encodeURIComponent(formData.name)}`, { method: 'POST' })
      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.detail || 'Folder picker failed')
      }

      const localPath = payload?.path?.trim() || ''
      const sharePointUrl = payload?.webUrl?.trim() || ''

      if (localPath) {
        setFolder({ path: localPath, status: 'linked', message: '' })
      } else if (sharePointUrl) {
        window.open(sharePointUrl, '_blank', 'noopener,noreferrer')
        setFolder({ path: sharePointUrl, status: 'linked', message: '' })
      } else {
        throw new Error('No folder path returned')
      }
    } catch (err) {
      // Try SharePoint link fallback
      try {
        const spRes = await fetch(`${API}/api/client/sharepoint_link?name=${encodeURIComponent(formData.name)}`)
        if (spRes.ok) {
          const spData = await spRes.json()
          if (spData?.webUrl) {
            window.open(spData.webUrl, '_blank', 'noopener,noreferrer')
            setFolder({ path: spData.webUrl, status: 'linked', message: '' })
            return
          }
        }
      } catch {}

      setFolder({ path: '', status: 'error', message: 'לא ניתן לקשר תיקייה' })
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitStatus('submitting')
    setSubmitError('')

    const clientPayload = {
      display_name: formData.name.trim(),
      email: parsedEmails,
      phone: formData.phone.trim(),
      client_type: formData.clientTypes,
      stage: formData.stage,
      notes: formData.notes.trim(),
      contacts: [],
    }

    if (folder.path) {
      clientPayload.folder = folder.path
    }

    if (selectedClient?.id && !isCreateMode) {
      clientPayload.airtable_id = selectedClient.id
      clientPayload.airtable_url = selectedClient.airtable_url || ''
    }

    try {
      // Create SharePoint folder (if creating new)
      if (!isEditMode && isCreateMode) {
        await fetch(`${API}/sp/folder_create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name.trim() }),
        }).catch(() => {}) // Non-blocking
      }

      // Upsert to Airtable
      await fetch(`${API}/airtable/clients_upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: parsedEmails[0],
          airtable_id: selectedClient?.id || undefined,
          phone: formData.phone.trim() || undefined,
        }),
      }).catch(() => {}) // Non-blocking - will be synced later

      // Save to local registry
      const regRes = await fetch(`${API}/registry/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientPayload),
      })

      if (!regRes.ok) {
        const errData = await regRes.json().catch(() => ({}))
        if (regRes.status === 409) {
          throw new Error('לקוח עם שם זה כבר קיים')
        }
        throw new Error(errData.detail || 'Failed to save client')
      }

      setSubmitStatus('success')
      onAdded?.()
      onClose?.()

    } catch (err) {
      setSubmitError(err.message || 'שגיאה בשמירת הלקוח')
      setSubmitStatus('error')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      data-testid="add-client-modal"
    >
      <div className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between bg-petrol px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">
            {isEditMode ? LABELS.modalTitleEdit : LABELS.modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Search Section */}
          {!isEditMode && (
            <section>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {LABELS.clientName} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={LABELS.searchPlaceholder}
                  className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                  data-testid="client-search-input"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{LABELS.searchHint}</p>
            </section>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && !isCreateMode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-amber-600">⚠️</span>
                <div>
                  <div className="font-medium text-amber-800">{LABELS.duplicateWarning}</div>
                  <div className="text-amber-700 mt-1">
                    "{duplicateWarning.name}" - {duplicateWarning.emails?.[0] || 'ללא אימייל'}
                  </div>
                  <button
                    onClick={() => handleSelectClient(duplicateWarning)}
                    className="mt-2 text-xs text-petrol underline hover:no-underline"
                  >
                    בחר לקוח זה
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {!isEditMode && searchStatus !== 'idle' && (
            <section>
              {searchStatus === 'searching' && (
                <div className="rounded-lg border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  {LABELS.searching}
                </div>
              )}

              {searchStatus === 'ready' && searchResults.length > 0 && !isCreateMode && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {LABELS.selectExisting}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {searchResults.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className={`w-full rounded-lg border px-4 py-3 text-right transition ${
                          selectedClient?.id === client.id
                            ? 'border-petrol bg-petrol/5'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-medium text-slate-800">{client.name}</div>
                        <div className="text-sm text-slate-500">
                          {client.emails?.[0] || client.phone || 'ללא פרטי קשר'}
                        </div>
                        {client.client_type?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {client.client_type.map((type) => (
                              <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSwitchToCreate}
                    className="w-full text-sm text-petrol hover:underline py-2"
                  >
                    ✨ {LABELS.createNew} "{searchQuery}"
                  </button>
                </div>
              )}

              {(searchStatus === 'empty' || isCreateMode) && (
                <div className="rounded-lg border border-dashed border-petrol/30 bg-petrol/5 px-4 py-4 text-center">
                  <div className="text-sm text-slate-700">
                    {searchStatus === 'empty'
                      ? `לא נמצא לקוח בשם "${searchQuery}"`
                      : `יוצר לקוח חדש: "${searchQuery}"`
                    }
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{LABELS.createHint}</div>
                </div>
              )}

              {searchStatus === 'error' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 text-center">
                  חיפוש Airtable נכשל, מציג תוצאות מקומיות
                </div>
              )}
            </section>
          )}

          {/* Form Fields - Show when creating or editing */}
          {(isCreateMode || isEditMode || selectedClient) && (
            <section className="space-y-4 border-t border-slate-100 pt-5">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                פרטי לקוח
              </div>

              {/* Name (read-only if selected from search) */}
              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {LABELS.clientName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {LABELS.email} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.emailsText}
                  onChange={(e) => updateForm('emailsText', e.target.value)}
                  rows={2}
                  placeholder="example@email.com, another@email.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">{LABELS.emailHint}</p>
              </div>

              {/* Phone & Stage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {LABELS.phone}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="052-1234567"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {LABELS.stage}
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => updateForm('stage', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol bg-white"
                  >
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {LABELS.clientType}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => toggleClientType(type.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        formData.clientTypes.includes(type.value)
                          ? 'bg-petrol text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {LABELS.notes}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol resize-none"
                />
              </div>

              {/* Folder Link (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {LABELS.folder}
                  <span className="text-xs text-slate-400 mr-2">(אופציונלי)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 bg-slate-50">
                    <span className="ml-2">📁</span>
                    <span className="truncate">{folder.path || 'לא נבחרה תיקייה'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBrowseFolder}
                    disabled={folder.status === 'linking'}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-petrol hover:bg-slate-50 disabled:opacity-50"
                  >
                    {folder.status === 'linking' ? LABELS.folderLinking : LABELS.folderBrowse}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${currentFolderPill.className}`}>
                    {currentFolderPill.label}
                  </span>
                  {folder.message && (
                    <span className="text-xs text-red-600">{folder.message}</span>
                  )}
                </div>
              </div>

              {/* Summary / Airtable Info */}
              {selectedClient && !isCreateMode && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs font-medium text-slate-500 mb-2">{LABELS.airtableId}</div>
                  <code className="text-xs text-slate-600">{selectedClient.id || 'N/A'}</code>
                  {selectedClient.airtable_url && (
                    <a
                      href={selectedClient.airtable_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block mt-2 text-xs text-petrol hover:underline"
                    >
                      פתח ב-Airtable ↗
                    </a>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            data-testid="client-modal-cancel"
          >
            {LABELS.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition ${
              canSubmit
                ? 'bg-petrol hover:bg-petrolHover active:bg-petrolActive'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
            data-testid="client-modal-submit"
          >
            {submitStatus === 'submitting'
              ? LABELS.submitting
              : isEditMode
                ? LABELS.submitEdit
                : LABELS.submit
            }
          </button>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </div>
    </div>
  )
}
