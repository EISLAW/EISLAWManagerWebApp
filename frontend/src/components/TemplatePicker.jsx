import React, { useEffect, useState } from 'react'

export default function TemplatePicker({ clientName, onGenerated, onClose }){
  const [list, setList] = useState([])
  const [status, setStatus] = useState('')
  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  useEffect(() => {
    (async()=>{
      try{
        const r = await fetch(`${API}/word/templates`)
        if(r.ok){ const j = await r.json(); setList(j.templates||[]) }
        else setList([])
      }catch{ setList([]) }
    })()
  }, [])

  async function generate(t){
    setStatus('Generating...')
    try{
      const r = await fetch(`${API}/word/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ client_name: clientName, template_path: t.path }) })
      if(r.ok){
        const j = await r.json(); setStatus('Generated')
        onGenerated && onGenerated({ type:'doc', label: t.name, url: j.webUrl || '', path: j.path || '' })
      } else setStatus('Failed')
    }catch{ setStatus('Failed') }
  }

  return (
    <div className="card">
      <div className="subheading mb-2">Choose Template</div>
      <div className="flex items-end gap-2 mb-2">
        <label className="text-sm">Filter
          <input className="mt-1 border rounded px-2 py-1" placeholder="Type to filter" onChange={e=>setList(prev=>prev.map(x=>x))/* no-op to keep reference */} />
        </label>
        <button className="px-3 py-2 rounded bg-slate-200" onClick={async()=>{
          try{
            const r = await fetch(`${API}/word/templates_root`); const j = r.ok? await r.json(): {path:''}
            if(j.path){ await fetch(`${API}/dev/desktop/open_path`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: j.path }) }) }
          }catch{}
        }}>Open Templates Folder</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-auto">
        {list.filter(t=> true /* future: apply filter */).map(t => (
          <button key={t.path} className="text-left px-3 py-2 rounded border hover:bg-cardGrey" onClick={()=>generate(t)}>{t.name}</button>
        ))}
        {list.length===0 && <div className="text-sm text-slate-500">No templates found</div>}
      </div>
      <div className="mt-2 text-sm">{status}</div>
      <div className="mt-2"><button className="px-3 py-1 rounded bg-slate-300" onClick={onClose}>Close</button></div>
    </div>
  )
}
