import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Calendar, MessageCircle, ThumbsUp, CheckCircle, X, ChevronDown } from 'lucide-react';
import TaskFiles from './TaskFiles.jsx';
import OwnerSelect from '../../components/OwnerSelect.jsx';
import { addClientSubtask } from './TaskAdapter';

const ownerOptions = [
  { id: 'owner.sara', name: 'שרה מ.' },
  { id: 'owner.yohanan', name: 'יוחנן ד.' },
  { id: 'owner.michael', name: 'מיכאל ר.' },
  { id: 'owner.emma', name: 'אמה ל.' }
];

const normalizeComment = (comment) => ({
  id: comment.id || crypto.randomUUID(),
  author: comment.author || 'אנונימי',
  avatar: comment.avatar || (comment.author ? comment.author.slice(0, 2) : '??'),
  text: comment.text || '',
  likes: comment.likes || 0,
  liked: !!comment.liked,
  resolved: !!comment.resolved,
  replies: (comment.replies || []).map((reply) => normalizeComment(reply))
});

const priorityOptions = {
  high: { label: 'גבוהה', className: 'bg-red-50 text-red-600' },
  medium: { label: 'בינונית', className: 'bg-yellow-50 text-yellow-700' },
  low: { label: 'נמוכה', className: 'bg-green-50 text-green-700' }
};

const tagPresets = [
  { id: 'tag.high', label: 'גבוהה', dot: 'bg-red-500' },
  { id: 'tag.medium', label: 'בינונית', dot: 'bg-yellow-500' },
  { id: 'tag.low', label: 'נמוכה', dot: 'bg-green-500' }
];

const formatDate = (iso) => {
  if (!iso) return 'ללא תאריך';
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
};

export default function TaskModal({
  task,
  tasks = [],
  subtasks = [],
  childrenMap = {},
  clientOptions = [],
  onClose,
  onToggle,
  onUpdate,
  onAddSubtask,
  onAddRootTask
}) {
  if (!task) return null;

  const taskId = task?.id || null;
  const [localComments, setLocalComments] = useState((task.comments || []).map(normalizeComment));
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [expandedRows, setExpandedRows] = useState(() => (taskId ? new Set([taskId]) : new Set()));
  const [subtaskDrafts, setSubtaskDrafts] = useState({});
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [showCompletedInline, setShowCompletedInline] = useState(false);

  useEffect(() => {
    setExpandedRows(new Set(taskId ? [taskId] : []));
    setSubtaskDrafts({});
    setTagsMenuOpen(false);
    setCustomTag('');
  }, [taskId]);

  const tags = task.tags || [];

  useEffect(() => {
    setLocalComments((task.comments || []).map(normalizeComment));
  }, [task.id]);

  const chips = useMemo(() => {
    const priority = task.priority && priorityOptions[task.priority] ? priorityOptions[task.priority] : null;
    const due = formatDate(task.dueAt);
    return { priority, due };
  }, [task.priority, task.dueAt]);

  const rootTasks = useMemo(() => {
    if (tasks && tasks.length) return tasks;
    return task ? [task] : [];
  }, [tasks, task]);

  const childLookup = useMemo(() => {
    const map = { ...(childrenMap || {}) };
    if (taskId) {
      if (subtasks && subtasks.length) map[taskId] = subtasks;
      else map[taskId] = map[taskId] || [];
    }
    return map;
  }, [childrenMap, subtasks, taskId]);

  const progress = useMemo(() => {
    const counts = { total: 0, done: 0 };
    const visit = (node) => {
      if (!node) return;
      counts.total += 1;
      if (node.status === 'done') counts.done += 1;
      const children = childLookup[node.id] || [];
      children.forEach(visit);
    };
    rootTasks.forEach(visit);
    return counts;
  }, [rootTasks, childLookup]);

  const doneCount = progress.done;
  const total = progress.total;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const doneNodes = useMemo(() => {
    const out = [];
    const visit = (node) => {
      if (!node) return;
      if (node.status === 'done') out.push(node);
      (childLookup[node.id] || []).forEach(visit);
    };
    rootTasks.forEach(visit);
    return out;
  }, [rootTasks, childLookup]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTagSelect = (tagLabel) => {
    if (!tagLabel) return;
    const next = Array.from(new Set([...(task.tags || []), tagLabel]));
    onUpdate(task.id, { tags: next });
    setTagsMenuOpen(false);
    setCustomTag('');
  };

  const renderTaskNode = (node, depth = 0) => {
    if (!node) return null;
    // Show only live tasks in the main list; completed appear under "משימות שבוצעו"
    if (node.status === 'done') return null;
    const children = childLookup[node.id] || [];
    const expanded = expandedRows.has(node.id);
    return (
      <div key={node.id} className={`space-y-2 ${depth ? 'pr-4' : ''}`}>
        <TaskRow
          task={node}
          expanded={expanded}
          onExpandToggle={() => toggleRow(node.id)}
          onToggle={() => onToggle(node)}
          onUpdate={onUpdate}
        />
        {expanded && (
          <div className="space-y-3 pr-4">
            {children.map((child) => renderTaskNode(child, depth + 1))}
            <SubtaskComposer
              parentId={node.id}
              value={subtaskDrafts[node.id] || ''}
              onChange={(value) => handleDraftChange(node.id, value)}
              onSubmit={() => handleSubtaskSubmit(node.id)}
            />
          </div>
        )}
      </div>
    );
  };

  const handleDraftChange = (parentId, value) => {
    setSubtaskDrafts((prev) => ({ ...prev, [parentId]: value }));
  };

  const addSubtaskWithTitle = (parentId, title) => {
    const finalTitle = (title || '').trim() || 'משימה חדשה';
    if (onAddSubtask) onAddSubtask(parentId, finalTitle);
    else addClientSubtask(parentId, finalTitle);
    setSubtaskDrafts((prev) => ({ ...prev, [parentId]: '' }));
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.add(parentId);
      return next;
    });
  };

  const handleSubtaskSubmit = (parentId) => {
    const draft = subtaskDrafts[parentId];
    if (!draft || !draft.trim()) return;
    addSubtaskWithTitle(parentId, draft);
  };

  const handleAddRootTask = () => {
    if (onAddRootTask) onAddRootTask('משימה חדשה');
    else if (taskId) addSubtaskWithTitle(taskId, 'משימה חדשה');
  };

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    const comment = normalizeComment({ author: 'אני', text: newComment.trim() });
    const next = [...localComments, comment];
    setLocalComments(next);
    try { onUpdate && onUpdate(task.id, { comments: next }) } catch {}
    setNewComment('');
  };

  const handleToggleResolve = (id) => {
    setLocalComments((prev) => {
      const next = prev.map((comment) => (comment.id === id ? { ...comment, resolved: !comment.resolved } : comment));
      try { onUpdate && onUpdate(task.id, { comments: next }) } catch {}
      return next;
    });
  };

  const handleToggleLike = (id) => {
    setLocalComments((prev) => {
      const next = prev.map((comment) =>
        comment.id === id
          ? {
              ...comment,
              liked: !comment.liked,
              likes: comment.liked ? Math.max(0, (comment.likes || 0) - 1) : (comment.likes || 0) + 1
            }
          : comment
      );
      try { onUpdate && onUpdate(task.id, { comments: next }) } catch {}
      return next;
    });
  };

  const handleReplyToggle = (id) => {
    setReplyingTo((prev) => (prev === id ? null : id));
  };

  const handleReplyChange = (id, value) => {
    setReplyDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleReplySubmit = (id) => {
    const text = (replyDrafts[id] || '').trim();
    if (!text) return;
    setLocalComments((prev) => {
      const next = prev.map((comment) =>
        comment.id === id
          ? { ...comment, replies: [...(comment.replies || []), normalizeComment({ author: 'אני', text })] }
          : comment
      );
      try { onUpdate && onUpdate(task.id, { comments: next }) } catch {}
      return next;
    });
    setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
    setReplyingTo(null);
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
  };

  const handleClientLink = (value) => {
    const nextClient = value || null
    if(onUpdate){
      onUpdate(task.id, { clientName: nextClient })
      const propagate = (nodeId) => {
        const kids = childLookup[nodeId] || []
        kids.forEach(k => {
          onUpdate(k.id, { clientName: nextClient })
          propagate(k.id)
        })
      }
      propagate(task.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="task-modal" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-auto">
        <header className="px-8 py-5 bg-petrol text-white rounded-t-2xl flex items-center justify-between">
          <div className="font-semibold text-lg" data-testid="task-title">{task.title || 'משימה'}</div>
          <button className="text-white/80 hover:text-white" onClick={onClose} data-testid="tm.modal.close" data-action="modal.close" aria-label="סגור">
            <X className="w-5 h-5" />
          </button>
        </header>

        <section className="px-8 pt-5 space-y-3" data-testid="progress">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{doneCount} מתוך {total} הושלמו</span>
            <span>התקדמות</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-2 bg-copper" style={{ width: `${pct}%` }} />
          </div>
        </section>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card space-y-4">
              <div className="heading">נכסים</div>
              <TaskFiles task={task} />
            </div>

            <div className="card space-y-3 text-sm">
              <div className="subheading">פרטים</div>
              <div className="flex flex-wrap gap-3 items-end">
                <label className="text-xs flex-1 min-w-[180px]">לקוח קשור
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={task.clientName || ''}
                    onChange={(e)=>handleClientLink(e.target.value)}
                  >
                    <option value="">ללא שיוך</option>
                    {clientOptions.map((nm) => (
                      <option key={nm} value={nm}>{nm}</option>
                    ))}
                  </select>
                </label>
              </div>
              {/* הוסר: עדכון תאריך/Owner כאן. העריכה מתבצעת ישירות בשורה של המשימה */}
              <div className="flex items-center justify-between" data-testid="tags">
                <div className="flex flex-wrap gap-1">
                  {tags.length ? tags.map((tag) => <span key={tag} className="badge">{tag}</span>) : <span className="text-xs text-slate-500">אין תגיות</span>}
                </div>
              </div>

              {doneNodes.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <button className="w-full flex items-center justify-between text-sm" onClick={()=> setShowCompletedInline(v=>!v)}>
                    <span className="font-medium">משימות שבוצעו</span>
                    <span className="text-slate-500">{showCompletedInline ? '▾' : '▸'}</span>
                  </button>
                  {showCompletedInline && (
                    <ul className="mt-1 space-y-1">
              {doneNodes.map(n => (
                <li key={n.id} className="flex items-center gap-2 text-sm text-slate-600 line-through">
                  <input type="checkbox" checked onChange={()=> onToggle && onToggle(n)} aria-label="סמן/בטל ביצוע" />
                  <span>{n.title || 'משימה'}</span>
                </li>
              ))}
                </ul>
              )}
            </div>
          )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card space-y-3" data-testid="tm.task.list">
              <div className="flex items-center justify-between gap-3">
                <div className="heading">משימות</div>
              </div>
              <div className="space-y-4">
                {rootTasks.length === 0 && <div className="text-sm text-slate-500">עוד לא נוצרו משימות.</div>}
                {rootTasks.map((root) => renderTaskNode(root))}
              </div>
            </div>

            <div className="card space-y-3">
              <div className="subheading">תגובות</div>
              {localComments.length === 0 && <div className="text-sm text-slate-500">אין תגובות עדיין.</div>}
              {localComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  isReplying={replyingTo === comment.id}
                  replyDraft={replyDrafts[comment.id] || ''}
                  onReplyToggle={() => handleReplyToggle(comment.id)}
                  onReplyChange={(value) => handleReplyChange(comment.id, value)}
                  onReplySubmit={() => handleReplySubmit(comment.id)}
                  onReplyCancel={handleReplyCancel}
                  onToggleResolve={() => handleToggleResolve(comment.id)}
                  onToggleLike={() => handleToggleLike(comment.id)}
                />
              ))}
              <div className="space-y-2">
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="כתוב תגובה..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  data-testid="tm.comment.input"
                />
                <div className="flex justify-end">
                  <button className="px-3 py-1 rounded bg-petrol text-white text-sm" onClick={handlePostComment} data-testid="tm.comment.create" data-action="comment.create">
                    פרסם תגובה
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 text-left">
          <button className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300" onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, expanded, onExpandToggle, onToggle, onUpdate }) {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [dueValue, setDueValue] = useState(task.dueAt ? task.dueAt.slice(0, 10) : '');
  const [titleDraft, setTitleDraft] = useState(task.title || '');

  useEffect(() => {
    setDueValue(task.dueAt ? task.dueAt.slice(0, 10) : '');
    setTitleDraft(task.title || '');
  }, [task.id, task.title, task.dueAt]);

  const priority = task.priority && priorityOptions[task.priority] ? priorityOptions[task.priority] : null;
  const due = formatDate(task.dueAt);

  const handleTitleBlur = () => {
    const nextTitle = titleDraft.trim() || 'משימה חדשה';
    if (nextTitle !== task.title) onUpdate(task.id, { title: nextTitle });
    else setTitleDraft(task.title || '');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2" data-testid="tm.task.item" data-task-id={task.id}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          onClick={onExpandToggle}
          aria-expanded={expanded}
          data-testid="tm.task.toggle_expand"
          data-action="task.toggle_expand"
          data-task-id={task.id}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <input type="checkbox" checked={task.status === 'done'} onChange={onToggle} className="w-4 h-4 accent-petrol" data-testid="tm.task.complete" data-task-id={task.id} />
        <input
          className={`flex-1 text-sm bg-transparent border border-transparent focus:border-slate-300 rounded px-2 py-1 ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={handleTitleBlur}
          data-testid="tm.task.title"
        />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {priority && (
          <span className={`px-2 py-0.5 rounded-full ${priority.className}`} data-testid="tm.task.priority.open" data-task-id={task.id} data-action="priority.open">
            {priority.label}
          </span>
        )}
        <button type="button" className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600" data-testid="tm.task.due.open" data-task-id={task.id} data-action="due.open" onClick={() => setDueOpen(v => !v)}>
            {due}
          </button>
      </div>
      {expanded && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="relative">
            <button className="flex items-center gap-1" onClick={() => setPriorityOpen((v) => !v)} data-testid="tm.task.priority.open" data-task-id={task.id} data-action="priority.open">
              קבע חשיבות
            </button>
            {priorityOpen && (
              <div className="absolute mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-2 space-y-1 w-32">
                {Object.entries(priorityOptions).map(([key, cfg]) => (
                  <button key={key} className="w-full text-right px-2 py-1 text-sm hover:bg-slate-50" onClick={() => { onUpdate(task.id, { priority: key }); setPriorityOpen(false); }}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button className="flex items-center gap-1" onClick={() => setDueOpen((v) => !v)} data-testid="tm.task.due.open" data-task-id={task.id} data-action="due.open">
              קבע תאריך
            </button>
            {dueOpen && (
              <div className="absolute mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-2 flex items-center gap-2">
                <input type="date" className="text-sm border border-slate-200 rounded px-2 py-1" value={dueValue} onChange={(e) => setDueValue(e.target.value)} />
                <button className="text-xs text-petrol" onClick={() => { onUpdate(task.id, { dueAt: dueValue }); setDueOpen(false); }}>שמור</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2" data-testid="tm.task.assignee">
            <span>אחראי:</span>
            <OwnerSelect value={task.ownerId || ''} onChange={(val) => onUpdate(task.id, { ownerId: val || null })} />
          </div>
        </div>
      )}
    </div>
  );
}

function SubtaskComposer({ parentId, value, onChange, onSubmit }) {
  const disabled = !(value || '').trim();
  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
        placeholder="הוסף תת-משימה"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        data-testid={`tm.subtask.input.${parentId}`}
      />
      <button
        className={`px-3 py-2 rounded flex items-center gap-1 ${disabled ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-petrol text-white'}`}
        onClick={onSubmit}
        disabled={disabled}
        aria-disabled={disabled}
        data-testid="tm.subtask.add"
        data-action="subtask.add"
        data-task-id={parentId}
      >
        <Plus className="w-4 h-4" /> הוסף
      </button>
    </div>
  );
}

function CommentCard({
  comment,
  isReplying,
  replyDraft,
  onReplyToggle,
  onReplyChange,
  onReplySubmit,
  onReplyCancel,
  onToggleResolve,
  onToggleLike
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2" data-testid="tm.comment.item">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-8 h-8 rounded-full bg-copper text-white flex items-center justify-center text-sm">{comment.avatar || '??'}</div>
        <div>
          <div className="font-medium">{comment.author || 'שם משתמש'}</div>
          <div className="text-xs text-slate-500">{comment.tag || ''}</div>
        </div>
      </div>
      <p className="text-sm text-slate-700">{comment.text || ''}</p>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <button className="flex items-center gap-1" data-testid="tm.comment.reply" data-action="comment.reply" data-comment-id={comment.id} onClick={onReplyToggle}>
          <MessageCircle className="w-3 h-3" /> תשובה
        </button>
        <button className={`flex items-center gap-1 ${comment.resolved ? 'text-green-600' : ''}`} data-testid="tm.comment.resolve" data-action="comment.resolve" data-comment-id={comment.id} onClick={onToggleResolve}>
          <CheckCircle className={`w-3 h-3 ${comment.resolved ? 'text-green-600' : ''}`} /> {comment.resolved ? 'נפתר' : 'סמן כנפתר'}
        </button>
        <button className={`flex items-center gap-1 ${comment.liked ? 'text-petrol font-semibold' : ''}`} data-testid="tm.comment.like" data-action="comment.like" data-comment-id={comment.id} onClick={onToggleLike}>
          <ThumbsUp className="w-3 h-3" /> {comment.likes || 0}
        </button>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2 mt-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="border border-slate-200 rounded-xl p-3 bg-cardGrey text-sm text-slate-700" data-testid="tm.comment.reply.item">
              <span className="font-medium">{reply.author}: </span>{reply.text}
            </div>
          ))}
        </div>
      )}
      {isReplying && (
        <div className="mt-3 space-y-2">
          <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="כתוב תשובה..." value={replyDraft} onChange={(e) => onReplyChange(e.target.value)} data-testid="tm.comment.reply.input" />
          <div className="flex gap-2 justify-end text-sm">
            <button className="px-3 py-1 rounded bg-slate-200 text-slate-700" onClick={onReplyCancel} data-testid="tm.comment.reply.cancel">ביטול</button>
            <button className="px-3 py-1 rounded bg-petrol text-white" onClick={onReplySubmit} data-testid="tm.comment.reply.post">פרסם תשובה</button>
          </div>
        </div>
      )}
    </div>
  );
}
