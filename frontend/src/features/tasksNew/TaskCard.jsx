import React, { useMemo, useState } from 'react'
import OwnerSelect from '../../components/OwnerSelect.jsx'

/**
 * Get due date status and badge info
 * @param {string|null} dueAt - ISO date string
 * @returns {{ status: 'overdue'|'today'|'tomorrow'|'upcoming'|'none', label: string, className: string }}
 */
function getDueBadgeInfo(dueAt) {
  if (!dueAt) return { status: 'none', label: '', className: '' }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowEnd = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000)

  const due = new Date(dueAt)

  if (due < todayStart) {
    const daysLate = Math.ceil((todayStart.getTime() - due.getTime()) / (24 * 60 * 60 * 1000))
    return {
      status: 'overdue',
      label: daysLate === 1 ? '🔴 באיחור יום' : `🔴 באיחור ${daysLate} ימים`,
      className: 'bg-red-100 text-red-700 border-red-200',
    }
  }

  if (due < todayEnd) {
    return {
      status: 'today',
      label: '📅 היום',
      className: 'bg-orange-100 text-orange-700 border-orange-200',
    }
  }

  if (due < tomorrowEnd) {
    return {
      status: 'tomorrow',
      label: '📅 מחר',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    }
  }

  // More than tomorrow - show date
  const formatted = due.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  return {
    status: 'upcoming',
    label: `📅 ${formatted}`,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  }
}

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
  const dueBadge = useMemo(() => getDueBadgeInfo(task.dueAt), [task.dueAt])

  return (
    <div className="p-2">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={task.status==='done'} onChange={()=> onToggle && onToggle(task)} data-testid={`task-checkbox-${task.id}`} />
        <input className={`flex-1 bg-transparent outline-none ${strike? 'line-through text-slate-500':''}`} value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>{ if (title!==task.title) onUpdate(task.id, { title }) }} data-testid={`task-title-${task.id}`} />
        <button className="text-sm" aria-label={open? 'כווץ' : 'הרחב'} onClick={()=>setOpen(v=>!v)}>{open? '▾' : '▸'}</button>
        {dueBadge.status !== 'none' && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${dueBadge.className}`} data-testid={`task-due-badge-${task.id}`}>
            {dueBadge.label}
          </span>
        )}
        <button className="text-sm underline text-petrol" onClick={()=> onOpen && onOpen(task)} data-testid={`task-open-${task.id}`}>פתח</button>
        <button className="text-sm underline text-petrol" onClick={()=>setOpen(v=>!v)}>{open? 'הסתר' : 'פרטים'}</button>
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
                  צפה בלקוח
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
            <span className="text-xs text-slate-500">אחראי</span>
            <OwnerSelect value={task.ownerId||''} onChange={(val)=> onUpdate && onUpdate(task.id, { ownerId: val||null })} />
            {!addingSub && <button className="text-xs underline text-petrol" onClick={()=>{ setAddingSub(true); setSubTitle('') }}>הוסף תת-משימה</button>}
            {addingSub && (
              <div className="flex items-end gap-2">
                <label className="text-xs">כותרת<input className="block mt-1 border rounded px-2 py-0.5" value={subTitle} onChange={e=>setSubTitle(e.target.value)} /></label>
                <button className="text-xs px-2 py-1 rounded bg-petrol text-white" onClick={()=>{ if(subTitle.trim()){ onAddSubtask(task.id, subTitle.trim()); setAddingSub(false); setSubTitle('') } }}>הוסף</button>
                <button className="text-xs underline" onClick={()=>{ setAddingSub(false); setSubTitle('') }}>ביטול</button>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2">תת-משימות</div>
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
