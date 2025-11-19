import React, { useEffect, useMemo, useState } from 'react'
import { archiveSweep, createTask, groupByOwner, listTasks, markDone, topN, updateTask, attach, addSubtask, allTasks } from '../lib/tasks'
import { currentUserEmail, listOwners } from '../lib/owners'
import TaskRow from './TaskRow'

export default function TasksPanel({ title, scope, clientFilter, limit = 5 }){
  const [owners, setOwners] = useState(listOwners())
  const [meEmail, setMeEmail] = useState('')
  const [items, setItems] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [openTaskId, setOpenTaskId] = useState(null)

  useEffect(() => { (async()=> setMeEmail(await currentUserEmail()))() }, [])
  useEffect(() => { archiveSweep(); refresh() }, [scope, clientFilter, meEmail])

  function refresh(){
    const base = listTasks({
      client: clientFilter || null,
      owner: scope==='me' ? 'me' : (scope==='delegated' ? 'all' : 'all'),
      delegatedOnly: scope==='delegated',
      timeWindowDays: 30,
      meEmail,
      owners,
    })
    setItems(limit && limit > 0 ? topN(base, limit) : base)
  }

  function add(){
    if(!newTitle.trim()) return
    createTask({ title: newTitle.trim(), clientName: clientFilter||null })
    setNewTitle(''); refresh()
  }

  const grouped = useMemo(() => scope==='delegated' ? groupByOwner(items) : null, [items, scope])

  // Build parent->children mapping for indentation display
  const all = allTasks()
  const childrenMap = useMemo(() => {
    const m = {}
    for (const t of all) {
      if (t.parentId) {
        m[t.parentId] = m[t.parentId] || []
        m[t.parentId].push(t)
      }
    }
    // order children by due date then updated
    for (const k of Object.keys(m)) {
      m[k] = m[k].sort((a,b)=>{
        const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
        const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
        if (ad !== bd) return ad - bd
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    }
    return m
  }, [all])

  return (
    <div className="card">
      <div className="subheading mb-2">{title}</div>
      <div className="flex gap-2 items-end mb-2">
        <label className="text-sm flex-1">New task
          <input className="mt-1 w-full border rounded px-2 py-1" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Do X for client Y"/>
        </label>
        <button className="px-3 py-2 rounded bg-petrol text-white" onClick={add}>Add</button>
      </div>
      {scope!=='delegated' && items.length===0 && <div className="text-sm text-slate-600">No tasks.</div>}
      {scope!=='delegated' && items.map(t => (
        <div key={t.id}>
          <TaskRow task={t}
            onUpdate={(id, patch)=>{ updateTask(id, patch); refresh() }}
            onMarkDone={()=>{ markDone(t.id); refresh() }}
            onAttach={(id, a)=>{ attach(id, a); refresh() }}
            onAddSubtask={(id, title)=>{ addSubtask(id, { title: title || 'Subtask' }); refresh() }}
          />
          {(childrenMap[t.id]||[]).map(st => (
            <TaskRow key={st.id} task={st}
              isSubtask
              indent={1}
              onUpdate={(id, patch)=>{ updateTask(id, patch); refresh() }}
              onMarkDone={()=>{ markDone(st.id); refresh() }}
              onAttach={(id, a)=>{ attach(id, a); refresh() }}
              onAddSubtask={()=>{ /* nested subtasks not supported v1 */ }}
            />
          ))}
        </div>
      ))}
      {scope==='delegated' && (
        <div className="space-y-3">
          {Object.entries(grouped||{}).map(([ownerId, arr]) => (
            <div key={ownerId}>
              <div className="font-semibold mb-1">{ownerId==='unassigned'? 'Unassigned' : (owners.find(o=>o.id===ownerId)?.name || ownerId)}</div>
              {arr.map(t => (
                <div key={t.id}>
                  <TaskRow task={t}
                    onUpdate={(id, patch)=>{ updateTask(id, patch); refresh() }}
                    onMarkDone={()=>{ markDone(t.id); refresh() }}
                    onAttach={(id, a)=>{ attach(id, a); refresh() }}
                    onAddSubtask={(id, title)=>{ addSubtask(id, { title: title || 'Subtask' }); refresh() }}
                  />
                  {(childrenMap[t.id]||[]).filter(st=> (st.ownerId||'')===ownerId).map(st => (
                    <TaskRow key={st.id} task={st}
                      isSubtask
                      indent={1}
                      onUpdate={(id, patch)=>{ updateTask(id, patch); refresh() }}
                      onMarkDone={()=>{ markDone(st.id); refresh() }}
                      onAttach={(id, a)=>{ attach(id, a); refresh() }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
