import React, { useEffect, useMemo, useState } from 'react'

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
      const normalized = {
        id: item.airtable_id || item.id || name,
        name,
        emails: emailList,
        phone: item.phone || '',
        client_type: item.client_type || [],
        status: item.stage || '',
        notes: item.notes || '',
        contacts: item.contacts || [],
        registry_defaults: {
          display_name: name,
          email: emailList,
          phone: item.phone || '',
          client_type: item.client_type || [],
          stage: item.stage || '',
          notes: item.notes || '',
          airtable_id: item.airtable_id || item.id || '',
        },
      }
      return normalized
    })
    .filter(Boolean)
}

function parseEmails(input = '') {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function normalizeSingleClient(item) {
  if (!item) return null
  const [normalized] = normalizeSeedRecords([item])
  if (normalized) return normalized
  const emails = Array.isArray(item.emails)
    ? item.emails
    : item.email
    ? [item.email]
    : []
  return {
    id: item.airtable_id || item.id || item.name || '',
    name: item.display_name || item.name || item.client_name || '',
    emails,
    phone: item.phone || '',
    client_type: item.client_type || [],
    status: item.stage || item.status || '',
    notes: item.notes || '',
    contacts: item.contacts || [],
    registry_defaults: item.registry_defaults || {},
  }
}

const folderPills = {
  idle: { label: 'Not linked', className: 'bg-[#EBF0FA] text-[#616E7C]' },
  not_linked: { label: 'Not linked', className: 'bg-[#EBF0FA] text-[#616E7C]' },
  linking: {
    label: 'Linking…',
    className: 'bg-[#FFF4E5] text-[#B76E00]',
  },
  linked: {
    label: 'Linked',
    className: 'bg-[#E6F7ED] text-[#16A34A] border border-[#16A34A33]',
  },
  error: {
    label: 'Error',
    className: 'bg-[#FEE2E2] text-[#B91C1C]',
  },
}

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
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchResults, setSearchResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [summary, setSummary] = useState(null)
  const [summaryStatus, setSummaryStatus] = useState('idle')
  const [folder, setFolder] = useState({
    path: '',
    status: 'not_linked',
    message: '',
  })
  const [addStatus, setAddStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [clientDraft, setClientDraft] = useState(null)
  const isEditMode = mode === 'edit'
  const normalizedInitial = useMemo(() => normalizeSingleClient(initialClient), [initialClient])
  const showSearchSection = !isEditMode
  const parsedEmails = useMemo(() => {
    if (clientDraft && typeof clientDraft.emailsText === 'string') {
      return parseEmails(clientDraft.emailsText)
    }
    return selectedClient?.emails || []
  }, [clientDraft, selectedClient])
  const draftName = (clientDraft?.name || '').trim() || selectedClient?.name || ''
  const draftPhone = clientDraft?.phone ?? selectedClient?.phone ?? ''
  const draftStatus = clientDraft?.status ?? selectedClient?.status ?? ''
  const draftNotes = clientDraft?.notes ?? selectedClient?.notes ?? ''
  const primaryEmailFromDraft = parsedEmails[0] || ''
  const resolvedClient = useMemo(() => {
    if (!selectedClient) return null
    return {
      ...selectedClient,
      name: draftName || selectedClient.name,
      emails: parsedEmails.length ? parsedEmails : selectedClient.emails || [],
      phone: draftPhone,
      notes: draftNotes,
      status: draftStatus,
    }
  }, [selectedClient, draftName, parsedEmails, draftPhone, draftNotes, draftStatus])
  const updateDraft = (field, value) => {
    setClientDraft((prev) => ({ ...(prev || {}), [field]: value }))
  }
  const summaryClient = resolvedClient || selectedClient
  const modalTitle = isEditMode ? 'Update Client' : 'Add Client'
  const submitLabel = isEditMode ? 'Save Changes' : 'Add Client'

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  useEffect(() => {
    if (normalizedInitial) {
      setSelectedClient(normalizedInitial)
      setSearchQuery(normalizedInitial.name || '')
      setSearchResults([normalizedInitial])
    }
  }, [normalizedInitial])

  useEffect(() => {
    if (!showSearchSection) {
      setSearchStatus('idle')
      return
    }
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchStatus('idle')
      return
    }
    setSearchStatus('searching')
    const controller = new AbortController()
    const handle = setTimeout(async () => {
      try {
        const endpoint = `${API}/airtable/search?q=${encodeURIComponent(
          searchQuery.trim()
        )}`
        const res = await fetch(endpoint, { signal: controller.signal })
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        setSearchResults(items)
        setSearchStatus(items.length ? 'ready' : 'empty')
      } catch (err) {
        if (controller.signal.aborted) return
        // Fallback to local rows (seed clients filter)
        const fallback = (seedClients || []).filter((c) => {
          const name = (c.name || '').toLowerCase()
          const emails = (c.emails || []).join(' ').toLowerCase()
          const q = searchQuery.toLowerCase()
          return name.includes(q) || emails.includes(q)
        })
        const normalized = normalizeSeedRecords(fallback)
        setSearchResults(normalized)
        setSearchStatus(normalized.length ? 'ready' : 'error')
      }
    }, 350)
    return () => {
      clearTimeout(handle)
      controller.abort()
    }
  }, [API, searchQuery, seedClients, showSearchSection])

  useEffect(() => {
    if (!showSearchSection) return
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return
    }
    if (
      !selectedClient ||
      !searchResults.some((item) => item.id === selectedClient.id)
    ) {
      setSelectedClient(searchResults[0])
    }
  }, [searchResults, selectedClient, showSearchSection])

  useEffect(() => {
    if (selectedClient) {
      setClientDraft({
        name: selectedClient.name || '',
        emailsText: (selectedClient.emails || []).join(', '),
        phone: selectedClient.phone || '',
        notes: selectedClient.notes || '',
        status: selectedClient.status || '',
      })
    } else {
      setClientDraft(null)
    }
  }, [selectedClient])

  useEffect(() => {
    if (!selectedClient) {
      setSummary(null)
      setSummaryStatus('idle')
      return
    }
    const controller = new AbortController()
    async function fetchSummary() {
      setSummaryStatus('loading')
      try {
        const res = await fetch(
          `${API}/api/client/summary?name=${encodeURIComponent(
            selectedClient.name
          )}&limit=10`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('Summary not available')
        const data = await res.json()
        setSummary(data)
        setSummaryStatus('ready')
      } catch (err) {
        if (!controller.signal.aborted) {
          setSummaryStatus('error')
        }
      }
    }
    fetchSummary()
    return () => controller.abort()
  }, [API, selectedClient])

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    if (!normalizedInitial?.folder) return
    setFolder((prev) => {
      if (prev.path) return prev
      return {
        path: normalizedInitial.folder,
        status: 'linked',
        message: '',
      }
    })
  }, [normalizedInitial])

  function openUrlInNewTab(url) {
    if (!url) return false
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer')
      if (win) return true
    } catch {}
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      return true
    } catch {}
    return false
  }

  async function fetchSharePointLink(clientName) {
    try {
      const res = await fetch(
        `${API}/api/client/sharepoint_link?name=${encodeURIComponent(
          clientName
        )}`
      )
      if (!res.ok) return ''
      const data = await res.json()
      return typeof data?.webUrl === 'string' ? data.webUrl : ''
    } catch {
      return ''
    }
  }

  async function handleBrowseFolder() {
    if (!summaryClient) {
      setFolder({
        path: '',
        status: 'error',
        message: 'Select a client first',
      })
      return
    }
    setFolder((s) => ({ ...s, status: 'linking', message: '' }))
    const fallbackToSharePoint = async (preferredLink) => {
      const link =
        preferredLink || (await fetchSharePointLink(summaryClient.name || ''))
      if (!link) return false
      const opened = openUrlInNewTab(link)
      setFolder({
        path: link,
        status: 'linked',
        message: opened
          ? ''
          : 'SharePoint link ready. Please open it in a new tab.',
      })
      return true
    }

    try {
      let payload = null
      const res = await fetch(
        `${API}/dev/open_folder?name=${encodeURIComponent(
          summaryClient.name || ''
        )}`,
        { method: 'POST' }
      )
      try {
        payload = await res.json()
      } catch {
        payload = null
      }
      if (!res.ok) {
        throw new Error(
          (payload && (payload.detail || payload.message)) ||
            'Folder picker failed'
        )
      }
      const localPath =
        typeof payload?.path === 'string' && payload.path.trim()
          ? payload.path
          : ''
      const sharePointUrl =
        typeof payload?.webUrl === 'string' && payload.webUrl.trim()
          ? payload.webUrl
          : ''
      if (localPath) {
        setFolder({
          path: localPath,
          status: 'linked',
          message: '',
        })
        return
      }
      const usedSharePoint = await fallbackToSharePoint(sharePointUrl)
      if (!usedSharePoint) {
        throw new Error('Folder picker returned no path.')
      }
    } catch (err) {
      const linked = await fallbackToSharePoint()
      if (!linked) {
        setFolder({
          path: '',
          status: 'error',
          message:
            'Could not link folder. Please try again or contact support.',
        })
      }
    }
  }

  async function handleSubmit() {
    if (!summaryClient) return
    setAddStatus('submitting')
    setSubmitError('')
    const name = draftName
    const primaryEmail = primaryEmailFromDraft
    const emailList = parsedEmails.length
      ? parsedEmails
      : summaryClient?.emails || []
    if (!name || !primaryEmail) {
      setSubmitError('Selected record is missing name or email.')
      setAddStatus('error')
      return
    }
    const contacts = [
      {
        name: summaryClient.owner || 'Primary Contact',
        email: primaryEmail,
      },
    ]
    try {
      const payloadBase = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
      if (!isEditMode) {
        await fetch(`${API}/sp/folder_create`, {
          ...payloadBase,
          body: JSON.stringify({ name }),
        })
      }
      await fetch(`${API}/airtable/clients_upsert`, {
        ...payloadBase,
        body: JSON.stringify({
          name,
          email: primaryEmail,
          airtable_id: summaryClient.id,
          phone: draftPhone || undefined,
        }),
      })
      const registryPayload = {
        display_name: name,
        email: emailList,
        phone: draftPhone || '',
        client_type: summaryClient.client_type || [],
        stage: draftStatus || summaryClient.status || '',
        notes: draftNotes || '',
        contacts:
          summaryClient.contacts && summaryClient.contacts.length
            ? summaryClient.contacts
            : contacts,
        airtable_id: summaryClient.id,
        airtable_url: summaryClient.airtable_url || summaryClient.airtableUrl || '',
      }
      if (folder.path) {
        registryPayload.folder = folder.path
      }
      await fetch(`${API}/registry/clients`, {
        ...payloadBase,
        body: JSON.stringify(registryPayload),
      })
      setAddStatus('success')
      setClientDraft(null)
      onAdded?.()
      onClose?.()
    } catch (err) {
      setSubmitError('Failed to add client. Please retry.')
      setAddStatus('error')
    }
  }

  const submitDisabled =
    !summaryClient ||
    !draftName ||
    !primaryEmailFromDraft ||
    addStatus === 'submitting' ||
    (!isEditMode && folder.status === 'error')

  const currentFolderPill =
    folderPills[folder.status] || folderPills.not_linked || folderPills.idle

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#0B3B5A] px-8 py-5 text-white">
          <h2 className="text-xl font-semibold">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-white px-8 py-6 md:flex-row">
          <div className="flex-1 space-y-6">
            {showSearchSection ? (
              <>
            <section>
              <label
                className="text-[12px] font-semibold uppercase tracking-wide text-[#0B3B5A]"
                htmlFor="airtable-search"
              >
                Search Airtable
              </label>
              <div className="mt-2 flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#0B3B5A]">
                <span className="mr-2 text-slate-400">🗄️</span>
                <input
                  id="airtable-search"
                  data-testid="clients.add.search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full border-none bg-transparent text-[16px] outline-none"
                />
              </div>
              <p className="mt-1 text-[13px] text-slate-500">
                Results refresh automatically (300 ms debounce).
              </p>
            </section>
              </>
            ) : (
              <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Editing client details sourced from Airtable/registry. Search is disabled in this mode.
              </section>
            )}
            {summaryClient && (
              <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-[#0B3B5A]">
                  Client Details
                </div>
                <div className="mt-3 space-y-3">
                  <label className="block text-sm font-medium text-slate-600">
                    Client name
                    <input
                      value={clientDraft?.name ?? ''}
                      onChange={(e) => updateDraft('name', e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-[#0B3B5A] focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Emails (comma separated)
                    <textarea
                      value={clientDraft?.emailsText ?? ''}
                      onChange={(e) => updateDraft('emailsText', e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-[#0B3B5A] focus:outline-none"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium text-slate-600">
                      Phone
                      <input
                        value={clientDraft?.phone ?? ''}
                        onChange={(e) => updateDraft('phone', e.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-[#0B3B5A] focus:outline-none"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Status/Stage
                      <input
                        value={clientDraft?.status ?? ''}
                        onChange={(e) => updateDraft('status', e.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-[#0B3B5A] focus:outline-none"
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-slate-600">
                    Notes
                    <textarea
                      value={clientDraft?.notes ?? ''}
                      onChange={(e) => updateDraft('notes', e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-[#0B3B5A] focus:outline-none"
                    />
                  </label>
                </div>
              </section>
            )}

            <section>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-[#0B3B5A]">
                Results
              </div>
              <div className="mt-3 space-y-2">
                {searchStatus === 'idle' && (
                  <div
                    data-testid="clients.add.search.empty"
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-slate-500"
                  >
                    <span className="text-3xl">🗄️</span>
                    <p className="mt-2 text-sm">
                      Enter a search term to find clients
                    </p>
                  </div>
                )}
                {searchStatus === 'searching' && (
                  <div className="rounded-lg border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    Searching…
                  </div>
                )}
                {searchStatus === 'empty' && (
                  <div className="rounded-lg border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No results found.
                  </div>
                )}
                {searchStatus === 'error' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
                    Airtable search failed, showing cached entries.
                  </div>
                )}
                {searchStatus === 'ready' &&
                  searchResults.map((client) => {
                    const isSelected =
                      selectedClient && selectedClient.id === client.id
                    const primaryEmail =
                      (client.emails && client.emails[0]) || client.email || ''
                    return (
                      <button
                        key={client.id}
                        data-testid="clients.add.result.select"
                        onClick={() => setSelectedClient(client)}
                        className={`w-full rounded-lg border px-4 py-3 text-left shadow-sm transition ${
                          isSelected
                            ? 'border-[#0B3B5A] bg-[#F5F7FB]'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#0B3B5A]">
                          {client.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {primaryEmail || client.phone || 'No contact info'}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                          {(client.client_type || []).map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full bg-slate-100 px-2 py-0.5"
                            >
                              {chip}
                            </span>
                          ))}
                          {client.status && (
                            <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200">
                              {client.status}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>
            </section>

            <section>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-[#0B3B5A]">
                Local Folder
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  <span className="mr-2 text-slate-400">📁</span>
                  <span className="block break-all whitespace-pre-wrap leading-tight">
                    {folder.path || 'No folder selected'}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="clients.add.link-folder"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-[#0B3B5A] hover:bg-slate-50 disabled:opacity-50"
                  onClick={handleBrowseFolder}
                  disabled={!selectedClient || folder.status === 'linking'}
                >
                  {folder.status === 'linking' ? 'Linking…' : 'Browse'}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${currentFolderPill.className}`}
                >
                  {currentFolderPill.label}
                </span>
                <span className="text-slate-500">
                  This calls <code>dev/open_folder</code> to reuse an existing
                  folder.
                </span>
              </div>
              {folder.status === 'error' && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {folder.message || 'Unable to link folder.'}
                </div>
              )}
            </section>
          </div>

          <aside className="w-full max-w-sm space-y-3 rounded-xl bg-[#F3F4F6] p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#0B3B5A]">
              Summary
            </div>
            {!summaryClient && (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Select a client to view summary
              </div>
            )}
                {summaryClient && (
                  <div
                    data-testid="clients.add.summary"
                    className="space-y-3 rounded-lg border border-white/60 bg-white px-4 py-3 shadow-inner"
                  >
                <div>
                  <div className="text-sm font-semibold text-[#0B3B5A]">
                    {summaryClient.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {(summaryClient.emails || []).join(', ') || 'No email'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">
                    {(summaryClient.emails || []).length} emails
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${currentFolderPill.className}`}
                  >
                    {currentFolderPill.label}
                  </span>
                  {(summaryClient.client_type || []).map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-white px-2 py-1 border border-slate-200 text-slate-600"
                    >
                      {type}
                    </span>
                  ))}
                  {summaryClient.status && (
                    <span className="rounded-full bg-[#0B3B5A]/10 px-2 py-1 text-[#0B3B5A]">
                      {summaryClient.status}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-slate-600">
                  Airtable ID:{' '}
                  <span className="font-mono">
                    {summaryClient.id || 'N/A'}
                  </span>
                </div>
                <div className="text-[12px] text-slate-500">
                  Owner: {summaryClient.owner || 'Unassigned'}
                </div>
                {summaryStatus === 'loading' && (
                  <div className="text-xs text-slate-500">Loading summary…</div>
                )}
                {summaryStatus === 'ready' && summary?.files && (
                  <div className="text-xs text-slate-500">
                    Files: {summary.files.length}
                  </div>
                )}
                {summaryClient.notes && (
                  <div className="text-xs text-slate-500 whitespace-pre-wrap border-t border-slate-100 pt-2">
                    {summaryClient.notes}
                  </div>
                )}
                {summaryClient.contacts && summaryClient.contacts.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <div className="text-xs font-semibold text-slate-600">
                      Contacts
                    </div>
                    <ul className="mt-1 space-y-1 text-xs text-slate-500 max-h-28 overflow-auto">
                      {summaryClient.contacts.slice(0, 5).map((c) => (
                        <li key={`${c.id}-${c.email || c.name}`}>
                          <div className="font-medium text-slate-700">
                            {c.name || c.email || 'Unnamed'}
                          </div>
                          <div>{c.email}</div>
                          <div>{c.phone}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summaryClient.airtable_url && (
                  <a
                    href={summaryClient.airtable_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#0B3B5A]"
                  >
                    Open in Airtable ↗
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-8 py-4">
          <button
            data-testid="clients.add.cancel"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            data-testid="clients.add.submit"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition ${
              submitDisabled
                ? 'cursor-not-allowed bg-[#EAC2AF]'
                : 'bg-[#D07655] hover:bg-[#bb6445]'
            }`}
          >
            {addStatus === 'submitting' ? 'Saving…' : submitLabel}
          </button>
        </div>
        {submitError && (
          <div className="border-t border-red-200 bg-red-50 px-8 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </div>
    </div>
  )
}
