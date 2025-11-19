import React, { useMemo, useState } from 'react'
import OwnerSelect from '../../components/OwnerSelect.jsx'

export default function TaskCard({
  task,
  subtasks,
  onUpdate,
  onAddSubtask,
  onAttach,
  onToggle,
  onOpen,
  showClientBadge = false,
}){
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(task.title || '')
  const [addingSub, setAddingSub] = useState(false)
  const [subTitle, setSubTitle] = useState('')

  const strike = task.status === 'done'

  return (
    <div className="p-2">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={task.status==='done'} onChange={()=> onToggle && onToggle(task)} />
        <input className={`flex-1 bg-transparent outline-none ${strike? 'line-through text-slate-500':''}`} value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>{ if (title!==task.title) onUpdate(task.id, { title }) }} />
        <button className="text-sm" aria-label={open? 'Collapse' : 'Expand'} onClick={()=>setOpen(v=>!v)}>{open? '▾' : '▸'}</button>
        {task.dueAt && <div className="text-xs text-copper">{new Date(task.dueAt).toLocaleDateString()}</div>}
        <button className="text-sm underline text-petrol" onClick={()=> onOpen && onOpen(task)}>Open</button>
        <button className="text-sm underline text-petrol" onClick={()=>setOpen(v=>!v)}>{open? 'Hide' : 'Details'}</button>
      </div>
      {showClientBadge && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {task.clientName
            ? (
              <>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                  לקוח: {task.clientName}
                </span>
                <button
                  className="text-petrol underline"
                  type="button"
                  onClick={() => {
                    if (task.clientName) {
                      const href = `/clients/${encodeURIComponent(task.clientName)}`
                      window.open(href, '_blank', 'noopener')
                    }
                  }}
                >
                  View client
                </button>
              </>
            )
            : <span className="italic text-slate-400">אין לקוח משויך</span>
          }
        </div>
      )}
      {open && (
        <div className="mt-2 pl-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Owner</span>
            <OwnerSelect value={task.ownerId||''} onChange={(val)=> onUpdate && onUpdate(task.id, { ownerId: val||null })} />
            {!addingSub && <button className="text-xs underline text-petrol" onClick={()=>{ setAddingSub(true); setSubTitle('') }}>Add subtask</button>}
            {addingSub && (
              <div className="flex items-end gap-2">
                <label className="text-xs">Title<input className="block mt-1 border rounded px-2 py-0.5" value={subTitle} onChange={e=>setSubTitle(e.target.value)} /></label>
                <button className="text-xs px-2 py-1 rounded bg-petrol text-white" onClick={()=>{ if(subTitle.trim()){ onAddSubtask(task.id, subTitle.trim()); setAddingSub(false); setSubTitle('') } }}>Add</button>
                <button className="text-xs underline" onClick={()=>{ setAddingSub(false); setSubTitle('') }}>Cancel</button>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2">Subtasks</div>
          <div className="divide-y">
            {(subtasks||[]).map(st => (
              <div key={st.id} className="py-1 pl-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={st.status==='done'} onChange={()=> onToggle(st)} />
                  <div className={`flex-1 ${st.status==='done'? 'line-through text-slate-500':''}`}>↳ {st.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
