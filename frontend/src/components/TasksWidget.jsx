import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronRight, Plus } from 'lucide-react'
import { getClientTasks, setTaskDone, addClientTask } from '../features/tasksNew/TaskAdapter'

/**
 * Get due date badge info for compact display
 */
function getDueBadge(dueAt) {
  if (!dueAt) return null

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowEnd = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000)
  const due = new Date(dueAt)

  if (due < todayStart) {
    const daysLate = Math.ceil((todayStart.getTime() - due.getTime()) / (24 * 60 * 60 * 1000))
    return { label: daysLate === 1 ? 'באיחור יום' : `באיחור ${daysLate} ימים`, className: 'bg-red-100 text-red-700' }
  }
  if (due < todayEnd) {
    return { label: 'היום', className: 'bg-orange-100 text-orange-700' }
  }
  if (due < tomorrowEnd) {
    return { label: 'מחר', className: 'bg-yellow-100 text-yellow-700' }
  }

  const formatted = due.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  return { label: formatted, className: 'bg-slate-100 text-slate-600' }
}

/**
 * Compact task list widget for client overview
 */
export default function TasksWidget({ clientName, limit = 5 }) {
  const [items, setItems] = useState({ parents: [], byParent: {} })
  const [quickAdd, setQuickAdd] = useState('')
  const [adding, setAdding] = useState(false)

  function refresh() {
    setItems(getClientTasks(clientName))
  }

  useEffect(() => {
    refresh()
    // Listen for external refresh events
    const handler = (evt) => {
      if (!evt?.detail?.client || evt.detail.client === clientName) {
        refresh()
      }
    }
    window.addEventListener('tasks:refresh', handler)
    return () => window.removeEventListener('tasks:refresh', handler)
  }, [clientName])

  const activeTasks = useMemo(() => {
    return items.parents
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        // Sort by due date (soonest first), then by creation
        const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
        const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
        if (aDue !== bDue) return aDue - bDue
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, limit)
  }, [items.parents, limit])

  const totalActive = items.parents.filter(t => t.status !== 'done').length
  const hasMore = totalActive > limit

  async function handleQuickAdd(e) {
    e.preventDefault()
    if (!quickAdd.trim()) return
    setAdding(true)
    try {
      addClientTask(clientName, quickAdd.trim())
      setQuickAdd('')
      refresh()
    } finally {
      setAdding(false)
    }
  }

  function handleToggle(task) {
    setTaskDone(task.id, task.status !== 'done')
    refresh()
  }

  const encodedName = encodeURIComponent(clientName)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="tasks-widget">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-slate-800">משימות</h3>
        <Link
          to={`/clients/${encodedName}?tab=tasks`}
          className="text-xs text-petrol hover:underline flex items-center gap-1"
        >
          הצג הכל <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y">
        {activeTasks.length === 0 && (
          <div className="p-4 text-sm text-slate-500 text-center">
            אין משימות פתוחות
          </div>
        )}

        {activeTasks.map(task => {
          const badge = getDueBadge(task.dueAt)
          const subtaskCount = (items.byParent[task.id] || []).length

          return (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
              data-testid={`task-row-${task.id}`}
            >
              <button
                onClick={() => handleToggle(task)}
                className="shrink-0 text-slate-400 hover:text-petrol transition-colors"
                data-testid={`task-toggle-${task.id}`}
              >
                {task.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm truncate ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {task.title}
                  </span>
                  {subtaskCount > 0 && (
                    <span className="text-xs text-slate-400">({subtaskCount})</span>
                  )}
                </div>
              </div>

              {badge && (
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick add form */}
      <form onSubmit={handleQuickAdd} className="border-t px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            placeholder="הוסף משימה חדשה..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
            disabled={adding}
            data-testid="quick-add-task"
          />
          {quickAdd.trim() && (
            <button
              type="submit"
              disabled={adding}
              className="text-xs px-2 py-1 rounded bg-petrol text-white hover:bg-petrolHover disabled:opacity-50"
            >
              הוסף
            </button>
          )}
        </div>
      </form>

      {hasMore && (
        <div className="border-t px-4 py-2 text-center">
          <Link
            to={`/clients/${encodedName}?tab=tasks`}
            className="text-xs text-slate-500 hover:text-petrol"
          >
            +{totalActive - limit} משימות נוספות
          </Link>
        </div>
      )}
    </div>
  )
}
