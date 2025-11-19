import React, { useEffect, useState } from 'react'
import { listOwners, upsertOwner, removeOwner } from '../../lib/owners'

export default function Admin(){
  const [owners, setOwners] = useState(listOwners())
  const [form, setForm] = useState({ name:'', email:'' })
  function refresh(){ setOwners(listOwners()) }
  function add(){ if(!form.name.trim()||!form.email.trim()) return; upsertOwner({ name:form.name.trim(), email:form.email.trim(), active:true }); setForm({name:'', email:''}); refresh() }
  function del(id){ removeOwner(id); refresh() }
  return (
    <div className="space-y-4">
      <h1 className="heading">Admin & Integrations</h1>
      <div className="card text-sm text-slate-700">
        <p>Integrations Health will appear here. For now, use local checks under tools/.</p>
      </div>
      <div className="card">
        <div className="subheading mb-2">Owners</div>
        <div className="flex gap-2 items-end mb-2">
          <label className="text-sm">Name<input className="mt-1 border rounded px-2 py-1" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/></label>
          <label className="text-sm">Email<input className="mt-1 border rounded px-2 py-1" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/></label>
          <button className="px-3 py-2 rounded bg-petrol text-white" onClick={add}>Add</button>
        </div>
        <div className="divide-y">
          {owners.length===0 && <div className="text-sm text-slate-600">No owners yet.</div>}
          {owners.map(o => (
            <div key={o.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-xs text-slate-500">{o.email}</div>
              </div>
              <button className="text-xs underline text-copper" onClick={()=>del(o.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
