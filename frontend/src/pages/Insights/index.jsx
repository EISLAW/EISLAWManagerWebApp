import React, { useEffect, useState } from 'react'

export default function Insights(){
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8788').replace(/\/$/,'')
  async function runSearch(){
    const url = `${API}/api/insights/search?q=${encodeURIComponent(q)}&top=5`
    try{ const r = await fetch(url); const j = await r.json(); setItems(j.items||[]) }catch{ setItems([]) }
  }
  useEffect(() => { /* no-op on mount */ }, [])
  return (
    <div className="space-y-4">
      <h1 className="heading" data-testid="insights-title">Insights</h1>
      <div className="card">
        <div className="flex gap-2 items-end">
          <label className="text-sm flex-1">Query<input className="mt-1 w-full border rounded px-2 py-1" value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g., hesitation reasons"/></label>
          <button className="px-3 py-2 rounded bg-petrol text-white" onClick={runSearch}>Search</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.length===0 && <div className="text-sm text-slate-600">No insights yet.</div>}
        {items.map((it,idx)=> (
          <div key={idx} className="card">
            <div className="font-medium">{it.title||'Insight'}</div>
            <div className="text-sm text-slate-600">{it.snippet||''}</div>
            <div className="mt-2">
              <button className="text-petrol underline">Convert to Content</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

