import React, { useMemo, useState } from 'react'
import { listOwners, upsertOwner } from '../lib/owners'

export default function OwnerSelect({ value, onChange }){
  const [owners, setOwners] = useState(listOwners())
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })

  const selected = useMemo(() => owners.find(o => o.id === value) || null, [owners, value])

  function refresh(){ setOwners(listOwners()) }

  function addOwner(){
    const name = form.name.trim(); const email = form.email.trim()
    if(!name || !email) return
    const created = upsertOwner({ id: undefined, name, email, active: true })
    setForm({ name:'', email:'' }); setAdding(false); refresh()
    if (created && created.id && onChange) onChange(created.id)
  }

  return (
    <div className="flex items-center gap-2">
      <select className="border rounded px-2 py-1 text-sm" value={value||''} onChange={e=>onChange && onChange(e.target.value||null)}>
        <option value="">Unassigned</option>
        {owners.map(o => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)}
      </select>
      <button className="text-xs underline text-petrol" onClick={()=>setAdding(v=>!v)}>{adding? 'Close' : 'Add Owner'}</button>
      {adding && (
        <div className="flex items-end gap-2">
          <label className="text-xs">Name<input className="block mt-1 border rounded px-2 py-0.5" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/></label>
          <label className="text-xs">Email<input className="block mt-1 border rounded px-2 py-0.5" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/></label>
          <button className="text-xs px-2 py-1 rounded bg-petrol text-white" onClick={addOwner}>Save</button>
        </div>
      )}
    </div>
  )
}
