import React, { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard.jsx'
import TaskModal from './TaskModal.jsx'
import { getClientTasks, addClientTask, setTaskDone, addClientSubtask, updateTaskFields } from './TaskAdapter'
import { attach } from '../../lib/tasks'
import { detectApiBase } from '../../utils/apiBase'

export default function TaskBoard({ clientName, showClientBadge = false, allowGlobalCreate = false }){
  const [items, setItems] = useState({ parents: [], byParent: {} })
  const [newTitle, setNewTitle] = useState('')
  const [newTaskClient, setNewTaskClient] = useState('')
  const [openId, setOpenId] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [clientOptions, setClientOptions] = useState([])
  const allowCreate = allowGlobalCreate || !!clientName
  function refresh(){ setItems(getClientTasks(clientName)) }
  function handleUpdate(id, patch = {}) {
    const keys = Object.keys(patch || {})
    if (!keys.length) { refresh(); return }
    updateTaskFields(id, patch)
    refresh()
  }
  useEffect(() => { refresh() }, [clientName])
  useEffect(() => {
    (async()=>{
      const base = await detectApiBase()
      if(!base) return
      try{
        const r = await fetch(`${base}/api/clients`)
        if(!r.ok) return
        const data = await r.json()
        const names = Array.isArray(data) ? data.map(c=>c?.name).filter(Boolean).sort((a,b)=>a.localeCompare(b, undefined, { sensitivity:'base' })) : []
        setClientOptions(names)
      }catch{
        setClientOptions([])
      }
    })()
  }, [])
  useEffect(() => {
    const handler = (evt) => {
      if(!evt?.detail?.client || evt.detail.client === clientName){
        refresh()
      }
    }
    window.addEventListener('tasks:refresh', handler)
    return () => window.removeEventListener('tasks:refresh', handler)
  }, [clientName])
  async function add(){
    if(!newTitle.trim()) return
    const targetClient = clientName || (newTaskClient || null)
    addClientTask(targetClient, newTitle.trim())
    setNewTitle('')
    if(!clientName) setNewTaskClient('')
    refresh()
  }
  const activeParents = items.parents.filter(t => t.status !== 'done')
  const doneParents = items.parents.filter(t => t.status === 'done')
  const finishedPoolLabel = useMemo(() => `משימות שבוצעו${clientName ? ` (${clientName})` : ''}`, [clientName])

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="task-board">
      {/* Task creation form */}
      {allowCreate ? (
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm flex-1 min-w-[200px]">משימה חדשה
              <input className="mt-1 w-full border rounded px-2 py-1" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="תאר את המשימה..." />
            </label>
            {allowGlobalCreate && (
              <label className="text-sm min-w-[180px]">לקוח
                <select className="mt-1 w-full border rounded px-2 py-1" value={newTaskClient} onChange={e=>setNewTaskClient(e.target.value)}>
                  <option value="">ללא לקוח</option>
                  {clientOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
            <button className="inline-flex items-center gap-1 px-3 py-2 rounded bg-petrol text-white disabled:opacity-50" onClick={add} disabled={!newTitle.trim()}>
              <Plus className="w-4 h-4" /> צור משימה
            </button>
          </div>
        </div>
      ) : (
        <div className="border-b px-4 py-3 text-sm text-slate-500">
          בחר לקוח כדי להוסיף משימות. תצוגת הדשבורד היא לקריאה בלבד.
        </div>
      )}

      {/* Active tasks list */}
      <div className="divide-y">
        {items.parents.length===0 && <div className="px-4 py-3 text-sm text-slate-500">אין משימות עדיין.</div>}
        {activeParents.map(t => (
          <div key={t.id} className="hover:bg-slate-50 transition-colors">
            <TaskCard
              task={t}
              subtasks={items.byParent[t.id]||[]}
              onUpdate={handleUpdate}
              onAddSubtask={(pid, title)=>{ addClientSubtask(pid, title, clientName); refresh() }}
              onAttach={(id,a)=>{ attach(id,a); refresh() }}
              onToggle={(tt)=>{ setTaskDone(tt.id, !(tt.status==='done')); refresh() }}
              onOpen={(tt)=> setOpenId(tt.id)}
              showClientBadge={showClientBadge}
              clientOptions={clientOptions}
            />
          </div>
        ))}
      </div>

      {/* Completed tasks section */}
      {doneParents.length > 0 && (
        <div className="border-t">
          <button className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 transition-colors" onClick={()=> setShowCompleted(v=>!v)}>
            <span className="font-medium text-slate-700">{finishedPoolLabel}</span>
            <span className="text-slate-400">{showCompleted ? '▾' : '▸'}</span>
          </button>
          {showCompleted && (
            <div className="divide-y border-t">
              {doneParents.map(t => (
                <div key={t.id} className="hover:bg-slate-50 transition-colors">
                  <TaskCard
                    task={t}
                    subtasks={items.byParent[t.id]||[]}
                    onUpdate={handleUpdate}
                    onAddSubtask={(pid, title)=>{ addClientSubtask(pid, title, clientName); refresh() }}
                    onAttach={(id,a)=>{ attach(id,a); refresh() }}
                    onToggle={(tt)=>{ setTaskDone(tt.id, !(tt.status==='done')); refresh() }}
                    onOpen={(tt)=> setOpenId(tt.id)}
                    showClientBadge={showClientBadge}
                    clientOptions={clientOptions}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {openId && (()=>{
        const task = items.parents.find(p=>p.id===openId) || items.byParent[openId]?.[0]
        const subs = items.byParent[openId] || []
        if(!task) return null
        return (
          <TaskModal
            task={task}
            tasks={[task]}
            subtasks={subs}
            childrenMap={items.byParent}
            onClose={()=> setOpenId(null)}
            onToggle={(tt)=>{ setTaskDone(tt.id, !(tt.status==='done')); refresh() }}
            onUpdate={handleUpdate}
            onAddSubtask={(parentId, title)=>{ addClientSubtask(parentId, title, clientName); refresh() }}
            onAddRootTask={(title)=>{ addClientTask(clientName, title); refresh() }}
            onAttach={(id,a)=>{ attach(id,a); refresh() }}
            clientOptions={clientOptions}
          />
        )
      })()}
    </div>
  )
}
