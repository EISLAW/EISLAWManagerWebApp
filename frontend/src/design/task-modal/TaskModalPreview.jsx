import React, { useState } from 'react';
import { X, FileText, Link as LinkIcon, Folder, Mail, Plus, MessageCircle, ThumbsUp, CheckCircle } from 'lucide-react';
import SubtaskItem from './SubtaskItem';
import AssetItem from './AssetItem';
import AttachEmailModal from './AttachEmailModal';

const tasks = [
  { id: 't1', title: 'מחקר מתחרים', completed: true, priority: 'high', priorityLabel: 'גבוהה', assigneeInitials: 'שמ', due: '10.11', },
  { id: 't2', title: 'עדכון קופי לקמפיין', completed: false, priority: 'medium', priorityLabel: 'בינונית', assigneeInitials: 'יד', due: '15.11', },
  { id: 't3', title: 'אישור קריאייטיב', completed: false, priority: 'low', priorityLabel: 'נמוכה', assigneeInitials: 'אמ', due: '20.11', },
];

const assets = [
  { id: 'a1', type: 'folder', name: 'נכסי קמפיין', meta: '5 פריטים', url: '#' },
  { id: 'a2', type: 'file', name: 'Marketing_Strategy_2025.pdf', meta: 'PDF · 2.1MB', url: '#' , fileType: 'pdf' },
  { id: 'a3', type: 'file', name: 'Budget_Analysis.xlsx', meta: 'XLSX · עודכן היום', url: '#', fileType: 'xlsx' },
  { id: 'a4', type: 'link', name: 'לוח מחקר מתחרים', meta: 'Notion', url: '#' },
  { id: 'a5', type: 'email', name: 'אישור הקצאת מחלקה', meta: 'ceo@company.com', emailFrom: 'ceo@company.com' },
];

const comments = [
  { id: 'c1', author: 'שרה מ.', avatar: 'שמ', text: 'התקדמות מצוינת בשלבי המחקר! בואו נעדכן כשיורדת הסדרה.', tag: 'שיווק', status: 'נפתר', replies: [
    { id: 'r1', author: 'יוחנן ד.', avatar: 'יד', text: 'מדהים! אין צורך בזמן נוסף כרגע.' }
  ] }
];

export default function TaskModalPreview() {
  const [attachOpen, setAttachOpen] = useState(false);
  return (
    <div className="min-h-screen bg-bg flex items-start justify-center py-12" dir="rtl">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-100">
        <div className="px-8 py-5 bg-petrol text-white flex items-center justify-between">
          <div className="font-semibold text-lg">השקת קמפיין שיווק רבעון 4</div>
          <button className="text-white/80 hover:text-white" data-testid="tm.modal.close" data-action="modal.close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pt-5 space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>7 מתוך 7 הושלמו</span>
            <span>התקדמות</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-2 bg-copper" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="heading">נכסים</h3>
              <div className="flex items-center gap-2 text-sm">
                <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-1"
                  data-testid="tm.assets.add.file" data-action="assets.add.file">
                  <FileText className="w-4 h-4" /> קובץ
                </button>
                <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-1"
                  data-testid="tm.assets.add.link" data-action="assets.add.link">
                  <LinkIcon className="w-4 h-4" /> לינק
                </button>
                <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-1"
                  data-testid="tm.assets.add.folder" data-action="assets.add.folder">
                  <Folder className="w-4 h-4" /> תיקייה
                </button>
                <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-1"
                  onClick={() => setAttachOpen(true)}
                  data-testid="tm.assets.add.email" data-action="assets.add.email">
                  <Mail className="w-4 h-4" /> אימייל
                </button>
              </div>
            </div>
            <div className="card space-y-2">
              {assets.map(asset => (
                <AssetItem key={asset.id} asset={asset} />
              ))}
            </div>

            <div className="card space-y-3 text-sm">
              <h3 className="subheading">פרטים</h3>
              <div className="flex items-center justify-between">
                <div className="text-slate-700">20.11.2025</div>
                <button className="text-slate-500 hover:text-petrol text-xs" data-testid="tm.details.due.open" data-action="details.due.open">
                  שנה
                </button>
              </div>
              <div className="flex items-center justify-between">
                <button className="px-3 py-1 rounded border border-slate-300 text-xs" data-testid="tm.details.calendar.sync" data-action="calendar.sync">
                  לסנכרן ליומן
                </button>
                <span className="text-slate-500 text-xs">סנכרון ליומן</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-copper text-white text-xs flex items-center justify-center">שמ</div>
                  <span>שרה מ.</span>
                </div>
                <button className="text-xs text-slate-500" data-testid="tm.details.owner.open" data-action="owner.open">החלף</button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge">Q4</span>
                  <button className="text-xs text-copper flex items-center gap-1" data-testid="tm.details.tags.add.open" data-action="tags.add.open">
                    <Plus className="w-3 h-3" /> הוסף תגית
                  </button>
                </div>
                <button className="text-xs text-slate-500" data-testid="tm.details.tags.remove" data-action="tags.remove">הסר</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="heading">משימות</div>
            <div className="space-y-2 bg-cardGrey border border-slate-200 rounded-2xl p-4" data-testid="tm.task.list">
              {tasks.map(task => (
                <SubtaskItem key={task.id} task={task} />
              ))}
              <div className="flex items-center gap-2">
                <input className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm" placeholder="הוסף תת-משימה" />
                <button className="px-3 py-2 rounded bg-petrol text-white flex items-center gap-1" data-testid="tm.subtask.add" data-action="subtask.add">
                  <Plus className="w-4 h-4" /> הוסף
                </button>
              </div>
            </div>

            <div className="card space-y-3">
              <div className="subheading">תגובות</div>
              {comments.map(comment => (
                <div key={comment.id} className="border border-slate-200 rounded-xl p-3 space-y-2" data-testid="tm.comment.item">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-copper text-white flex items-center justify-center text-sm">{comment.avatar}</div>
                    <div>
                      <div className="font-medium">{comment.author}</div>
                      <div className="text-xs text-slate-500">{comment.tag}</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{comment.text}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <button className="flex items-center gap-1" data-testid="tm.comment.reply" data-action="comment.reply" data-comment-id={comment.id}>
                      <MessageCircle className="w-3 h-3" /> תשובה
                    </button>
                    <button className="flex items-center gap-1" data-testid="tm.comment.like" data-action="comment.like" data-comment-id={comment.id}>
                      <ThumbsUp className="w-3 h-3" /> אהבתי
                    </button>
                    <button className="flex items-center gap-1" data-testid="tm.comment.resolve" data-action="comment.resolve" data-comment-id={comment.id}>
                      <CheckCircle className="w-3 h-3" /> סמן כנפתר
                    </button>
                  </div>
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="ml-8 border border-slate-200 rounded-lg p-2 text-sm text-slate-700">
                      <span className="font-medium">{reply.author}:</span> {reply.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AttachEmailModal open={attachOpen} onClose={() => setAttachOpen(false)} />
    </div>
  );
}

