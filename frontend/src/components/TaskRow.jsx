import React, { useMemo, useState } from 'react'
import AttachmentList from './AttachmentList'
import OwnerSelect from './OwnerSelect'
import TemplatePicker from './TemplatePicker'
import { openEmailSearchForClient, openClientFiles } from '../lib/openers'

export default function TaskRow({ task, onUpdate, onAttach, onAddSubtask, onMarkDone, indent = 0, isSubtask = false }){
  const [open, setOpen] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [attMode, setAttMode] = useState('')
  const [attForm, setAttForm] = useState({ label: '', value: '' })
  const [addingSub, setAddingSub] = useState(false)
  const [subTitle, setSubTitle] = useState('')
  const strike = task.status === 'done'
  const pad = useMemo(()=> ({ paddingLeft: `${indent * 16}px` }), [indent])

  return (
    <div className="p-2" style={pad}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={task.status==='done'} onChange={e=> onMarkDone && onMarkDone(task)} />
        <div className={`flex-1 ${strike? 'line-through text-slate-500':''}`}>{isSubtask? '↳ ' : ''}{task.title}</div>
        {task.clientName && <div className="text-xs px-1.5 py-0.5 rounded bg-slate-100">{task.clientName}</div>}
        {task.dueAt && <div className="text-xs text-copper">Due {new Date(task.dueAt).toLocaleDateString()}</div>}
        <button className="text-petrol underline text-sm" onClick={()=>setOpen(v=>!v)}>{open? 'Hide' : 'Details'}</button>
      </div>
      {open && (
        <div className="mt-2 pl-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Owner</span>
            <OwnerSelect value={task.ownerId||''} onChange={(val)=> onUpdate && onUpdate(task.id, { ownerId: val||null })} />
            {!addingSub && <button className="text-xs underline text-petrol" onClick={()=>{ setAddingSub(true); setSubTitle('') }}>Add subtask</button>}
            {addingSub && (
              <div className="flex items-end gap-2">
                <label className="text-xs">Title
                  <input className="block mt-1 border rounded px-2 py-0.5" value={subTitle} onChange={e=>setSubTitle(e.target.value)} placeholder="Subtask title"/>
                </label>
                <button className="text-xs px-2 py-1 rounded bg-petrol text-white" onClick={()=>{ if(subTitle.trim()){ onAddSubtask && onAddSubtask(task.id, subTitle.trim()); setAddingSub(false); setSubTitle('') } }}>Add</button>
                <button className="text-xs underline" onClick={()=>{ setAddingSub(false); setSubTitle('') }}>Cancel</button>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">Add:</span>
              <button className={`text-xs underline ${attMode==='link'?'font-semibold text-petrol':'text-petrol'}`} onClick={()=>{ setAttMode('link'); setAttForm({ label:'', value:'' }) }}>Link</button>
              <button className={`text-xs underline ${attMode==='email'?'font-semibold text-petrol':'text-petrol'}`} onClick={()=>{ setAttMode('email'); setAttForm({ label:'', value:'' }) }}>Email</button>
              <button className={`text-xs underline ${attMode==='file'?'font-semibold text-petrol':'text-petrol'}`} onClick={()=>{ setAttMode('file'); setAttForm({ label:'', value:'' }) }}>File</button>
              <button className={`text-xs underline ${attMode==='folder'?'font-semibold text-petrol':'text-petrol'}`} onClick={async()=>{
                setAttMode('folder'); setAttForm({ label:'Task Folder', value:'' })
                // Ensure SP task folder and open local/SharePoint view
                try{
                  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
                  const res = await fetch(`${API}/sp/task_folder_ensure`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ client_name: task.clientName||'', task_id: task.id }) })
                  if(res.ok){ const j = await res.json(); if(j.webUrl){ window.open(j.webUrl, '_blank', 'noopener,noreferrer') } }
                }catch{}
              }}>Folder</button>
            </div>
          </div>
          {attMode && (
            <div className="mt-2 flex items-end gap-2">
              <label className="text-xs">Label
                <input className="block mt-1 border rounded px-2 py-0.5" value={attForm.label} onChange={e=>setAttForm({...attForm, label:e.target.value})}/>
              </label>
              <label className="text-xs">{attMode==='email' ? 'Message link/ID' : (attMode==='file' ? 'Choose file' : 'Path or URL')}
                <input className="block mt-1 border rounded px-2 py-0.5 min-w-[240px]" value={attForm.value} onChange={e=>setAttForm({...attForm, value:e.target.value})}/>
              </label>
              <button className="text-xs px-2 py-1 rounded bg-petrol text-white" onClick={async()=>{
                if(!onAttach) return
                if(attMode==='link') onAttach(task.id, { type:'link', label: attForm.label||'Link', url: attForm.value })
                if(attMode==='email') onAttach(task.id, { type:'email', label: attForm.label||'Email', openUrl: attForm.value.startsWith('http')? attForm.value : undefined, messageId: !attForm.value.startsWith('http')? attForm.value : undefined })
                if(attMode==='file'){
                  // Upload via SharePoint task folder
                  try{
                    const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
                    // Use a hidden input to choose file
                    const inp = document.createElement('input'); inp.type = 'file';
                    inp.onchange = async () => {
                      const f = inp.files && inp.files[0]; if(!f) return
                      const fd = new FormData(); fd.append('client_name', task.clientName||''); fd.append('task_id', task.id); fd.append('file', f, f.name)
                      try{
                        const r = await fetch(`${API}/sp/task_upload`, { method:'POST', body: fd })
                        if(r.ok){ const j = await r.json(); onAttach(task.id, { type:'file', label: attForm.label||f.name, url: j.webUrl || '', path: j.path||'' }) }
                      }catch{}
                    }
                    inp.click()
                  }catch{}
                }
                if(attMode==='folder') onAttach(task.id, { type:'folder', label: attForm.label||'Task Folder', url: '', path: '' })
                setAttMode(''); setAttForm({ label:'', value:'' })
              }}>Attach</button>
              <button className="text-xs underline" onClick={()=>{ setAttMode(''); setAttForm({label:'', value:''}) }}>Cancel</button>
            </div>
          )}
          <div className="mt-2">
            <AttachmentList items={task.attachments||[]} />
          </div>
          <div className="mt-2">
            <button className="text-xs underline text-petrol" onClick={()=>setShowTemplate(true)}>Choose Template</button>
            {task.clientName && (
              <>
                <span className="mx-2 text-slate-400">|</span>
                <button className="text-xs underline text-petrol" onClick={()=>openEmailSearchForClient(task.clientName)}>Open Emails</button>
                <button className="text-xs underline text-petrol" onClick={()=>openClientFiles(task.clientName)}>Open Client Folder</button>
                <span className="mx-2 text-slate-400">|</span>
                <button className="text-xs underline text-petrol" onClick={async()=>{
                  // Open Task Folder locally (Explorer) if available; else open SP
                  try{
                    const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'')
                    const r = await fetch(`${API}/api/task/local_folder?client_name=${encodeURIComponent(task.clientName||'')}&task_id=${encodeURIComponent(task.id)}`)
                    const j = r.ok? await r.json() : {}
                    if(j.localFolder){ await fetch(`${API}/dev/desktop/open_path`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: j.localFolder }) }); return }
                  }catch{}
                  try{
                    const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'')
                    const r2 = await fetch(`${API}/sp/task_folder_ensure`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ client_name: task.clientName||'', task_id: task.id }) })
                    if(r2.ok){ const j2 = await r2.json(); if(j2.webUrl){ window.open(j2.webUrl, '_blank', 'noopener,noreferrer') } }
                  }catch{}
                }}>Open Task Folder</button>
              </>
            )}
          </div>
          {showTemplate && (
            <div className="mt-2">
              <TemplatePicker clientName={task.clientName||''} onGenerated={(att)=>{ onAttach && onAttach(task.id, att); setShowTemplate(false) }} onClose={()=>setShowTemplate(false)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
