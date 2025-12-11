import React from 'react';
import { Tag, User, Calendar } from 'lucide-react';

export default function SubtaskItem({ task }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2" data-testid="tm.task.item">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={task.completed}
          readOnly
          className="w-4 h-4 accent-petrol"
          data-testid="tm.task.complete"
          data-task-id={task.id}
        />
        <div className={`flex-1 text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.title}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
          task.priority === 'high' ? 'bg-red-50 text-red-600' :
          task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
          'bg-green-50 text-green-700'
        }`}
          data-testid="tm.task.priority.open"
          data-task-id={task.id}
          data-action="priority.open"
        >
          <Tag className="w-3 h-3" /> {task.priorityLabel}
        </button>
        <button className="px-2 py-0.5 rounded-full bg-petrol/10 text-petrol flex items-center gap-1"
          data-testid="tm.task.assignee.open"
          data-task-id={task.id}
          data-action="assignee.open"
        >
          <User className="w-3 h-3" /> {task.assigneeInitials}
        </button>
        <button className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1"
          data-testid="tm.task.due.open"
          data-task-id={task.id}
          data-action="due.open"
        >
          <Calendar className="w-3 h-3" /> {task.due}
        </button>
      </div>
    </div>
  );
}

