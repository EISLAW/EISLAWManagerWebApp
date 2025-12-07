import React, { useEffect, useMemo, useState } from 'react'

function normalizeRecords(items = []) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (!item) return null
      const name = item.name || item.display_name || item.client_name || ''
      if (!name) return null
      const emails = Array.isArray(item.emails)
        ? item.emails
        : item.email
        ? [item.email]
        : []
      return {
        id: item.id || item.airtable_id || name,
        name,
        emails,
        phone: item.phone || '',
        status: item.status || '',
        notes: item.notes || '',
        airtable_url: item.airtable_url || item.airtableUrl || '',
        raw: item,
      }
    })
    .filter(Boolean)
}

export default function LinkAirtableModal({
  apiBase,
  envApi,
  clientName,
  clientSummary,
  onClose,
  onLinked,
}) {
  const API = useMemo(
    () => (apiBase || envApi || 'http://127.0.0.1:8788').replace(/\/$/, ''),
    [apiBase, envApi]
  )
  const [query, setQuery] = useState(clientName || '')
  const [status, setStatus] = useState('idle')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = bodyOverflow
    }
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setStatus('idle')
      return
    }
    setStatus('searching')
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const endpoint = `${API}/airtable/search?q=${encodeURIComponent(query.trim())}`
        const res = await fetch(endpoint, { signal: controller.signal })
        if (!res.ok) throw new Error('search failed')
        const data = await res.json()
        const normalized = normalizeRecords(data?.items || [])
        setResults(normalized)
        setStatus(normalized.length ? 'ready' : 'empty')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
      }
    }, 350)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [API, query])

  useEffect(() => {
    if (!results.length) {
      setSelected(null)
      return
    }
    if (!selected || !results.some((item) => item.id === selected.id)) {
      setSelected(results[0])
    }
  }, [results, selected])

  const existing = clientSummary?.client || {}
  const existingEmails = Array.isArray(existing.emails)
    ? existing.emails
    : existing.email
    ? [existing.email]
    : []

  async function handleLink() {
    if (!selected) return
    const emails = selected.emails?.length ? selected.emails : existingEmails
    if (!emails.length) {
      setError('The selected record is missing an email address.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payloadBase = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      const upsertRes = await fetch(`${API}/airtable/clients_upsert`, {
        ...payloadBase,
        body: JSON.stringify({
          name: selected.name,
          email: emails[0],
          airtable_id: selected.id,
          phone: selected.phone || existing.phone || undefined,
        }),
      })
      if (!upsertRes.ok) {
        const msg = await upsertRes.text()
        throw new Error(msg || 'Airtable upsert failed')
      }

      // Update existing client with airtable_id (PATCH, not POST)
      const clientId = existing.id
      if (!clientId) {
        throw new Error('Client ID not found. Cannot link Airtable record.')
      }
      const regRes = await fetch(`${API}/registry/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airtable_id: selected.id,
          airtable_url: selected.airtable_url || '',
        }),
      })
      if (!regRes.ok) {
        const msg = await regRes.text()
        throw new Error(msg || 'Registry update failed')
      }
      setSubmitting(false)
      onLinked?.(selected)
    } catch (err) {
      console.error('link airtable', err)
      setError(err?.message || 'Failed to link Airtable record. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <div className="text-lg font-semibold text-petrol">Link Airtable Record</div>
            <div className="text-xs text-slate-500">Select the matching Airtable entry for {clientName}</div>
          </div>
          <button className="text-sm text-slate-500 hover:text-slate-800" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Search Airtable</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by client name or email"
            />
          </div>
          <div className="max-h-64 overflow-auto rounded border">
            {status === 'idle' && (
              <div className="p-3 text-sm text-slate-500">Enter a search term to find Airtable records.</div>
            )}
            {status === 'searching' && (
              <div className="p-3 text-sm text-slate-500">Searching Airtable…</div>
            )}
            {status === 'empty' && (
              <div className="p-3 text-sm text-slate-500">No records matched your search.</div>
            )}
            {status === 'error' && (
              <div className="p-3 text-sm text-red-600">
                Unable to search Airtable. Check network/connectivity and try again.
              </div>
            )}
            {status === 'ready' && (
              <ul className="divide-y">
                {results.map((item) => (
                  <li
                    key={item.id}
                    className={`px-3 py-2 cursor-pointer text-sm ${
                      selected?.id === item.id ? 'bg-petrol/5 border-l-4 border-petrol' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelected(item)}
                  >
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {(item.emails || []).join(', ') || 'No email listed'}
                    </div>
                    {item.phone && <div className="text-xs text-slate-500">{item.phone}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-3">
          <button className="rounded-full px-4 py-1 text-sm text-slate-600" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-full bg-petrol px-4 py-1 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!selected || submitting}
            onClick={handleLink}
          >
            {submitting ? 'Linking…' : 'Link Airtable'}
          </button>
        </div>
      </div>
    </div>
  )
}
