import React, { useEffect, useState } from 'react'

export default function DashboardEmails({ apiBase, clientFilter }) {
  const [state, setState] = useState({ loading: false, items: [], error: '' })

  useEffect(() => {
    if (!apiBase || !clientFilter) {
      setState({ loading: false, items: [], error: '' })
      return
    }
    const controller = new AbortController()
    const run = async () => {
      setState({ loading: true, items: [], error: '' })
      try {
        const params = new URLSearchParams({
          name: clientFilter,
          limit: '5',
          offset: '0',
        })
        const res = await fetch(`${apiBase}/email/by_client?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to load emails')
        const data = await res.json()
        setState({
          loading: false,
          items: Array.isArray(data?.items) ? data.items : [],
          error: '',
        })
      } catch (err) {
        if (controller.signal.aborted) return
        setState({ loading: false, items: [], error: err?.message || 'Error' })
      }
    }
    run()
    return () => controller.abort()
  }, [apiBase, clientFilter])

  if (!clientFilter) {
    return (
      <div className="rounded-2xl border border-slate-200 p-4 bg-white">
        <div className="text-sm font-semibold text-petrol">Recent Emails</div>
        <p className="text-xs text-slate-500 mt-2">
          Select a client filter to view their latest indexed emails.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-petrol">Recent Emails</div>
          <div className="text-xs text-slate-500">{clientFilter}</div>
        </div>
        {state.loading && <div className="text-xs text-slate-400">Loading…</div>}
      </div>
      {state.error && (
        <div className="mt-3 text-xs text-red-600">{state.error}</div>
      )}
      {!state.error && !state.loading && state.items.length === 0 && (
        <div className="mt-3 text-xs text-slate-500">No emails yet.</div>
      )}
      <ul className="mt-3 space-y-2">
        {state.items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50"
          >
            <div className="text-xs text-slate-500">
              {(item.received || '').slice(0, 16)} · {item.from || 'Unknown'}
            </div>
            <div className="text-sm font-medium text-slate-800 truncate">
              {item.subject || '(no subject)'}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-right">
        <button
          className="text-xs text-petrol underline"
          onClick={() =>
            window.location.assign(
              `/clients/${encodeURIComponent(clientFilter)}?tab=emails`
            )
          }
        >
          Open client emails
        </button>
      </div>
    </div>
  )
}
