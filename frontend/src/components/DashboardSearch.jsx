import React, { useEffect, useState } from 'react'

export default function DashboardSearch({ onSelectClient, onCreateClient }){
  const [q, setQ] = useState('')
  const [items, setItems] = useState({ clients: [], contacts: [] })
  const [loading, setLoading] = useState(false)
  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  useEffect(() => {
    const h = setTimeout(async () => {
      const term = q.trim()
      if (!term) { setItems({ clients: [], contacts: [] }); return }
      try {
        setLoading(true)
        // For MVP, reuse registry clients endpoint; Airtable-specific search can come later
        const url = `${API}/api/clients`
        const r = await fetch(url)
        const j = r.ok ? await r.json() : []
        const clients = (j || []).filter(c => (c.name || '').toLowerCase().includes(term.toLowerCase()))
        setItems({ clients, contacts: [] })
      } catch {
        setItems({ clients: [], contacts: [] })
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(h)
  }, [q])

  return (
    <div className="card">
      <div className="flex gap-2 items-end">
        <label className="text-sm flex-1">Search
          <input className="mt-1 w-full border rounded px-2 py-1" value={q} onChange={e=>setQ(e.target.value)} placeholder="Client, contact, email..."/>
        </label>
        <button className="px-3 py-2 rounded bg-petrol text-white" onClick={()=>{ /* explicit search handled by debounce */ }} disabled={loading}>Search</button>
      </div>
      {(items.clients.length>0) && (
        <div className="mt-3">
          <div className="text-xs text-slate-500 mb-1">Clients</div>
          <div className="divide-y">
            {items.clients.map(c => (
              <div key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">{(c.emails||[]).join(', ')}</div>
                </div>
                <div className="flex gap-2 text-sm">
                  <button className="text-petrol underline" onClick={()=>onSelectClient && onSelectClient(c.name)}>Open Card</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(q && items.clients.length===0 && !loading) && (
        <div className="mt-3 text-sm text-slate-600">No client found. <button className="text-petrol underline" onClick={()=>onCreateClient && onCreateClient(q)}>Create client</button></div>
      )}
    </div>
  )
}

