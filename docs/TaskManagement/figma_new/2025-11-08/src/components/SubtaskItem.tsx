import { useState } from 'react';
import { Trash2, Calendar, ChevronLeft, Tag, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  assignee?: string;
  priority?: 'high' | 'medium' | 'low';
  indent: number;
  isExpanded?: boolean;
}

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Subtask>) => void;
  onToggleExpand?: (id: string) => void;
  getPriorityColor: (priority?: 'high' | 'medium' | 'low') => string;
  getPriorityLabel: (priority?: 'high' | 'medium' | 'low') => string;
  hasChildren?: boolean;
}

export function SubtaskItem({ 
  subtask, 
  onToggle, 
  onDelete, 
  onUpdate,
  onToggleExpand,
  getPriorityColor,
  getPriorityLabel,
  hasChildren = false,
}: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(subtask.title);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = () => {
    if (editedTitle.trim()) {
      onUpdate(subtask.id, { title: editedTitle });
    }
    setIsEditing(false);
  };

  const setPriority = (priority: 'high' | 'medium' | 'low') => {
    onUpdate(subtask.id, { priority });
    setShowPriorityMenu(false);
  };

  const setAssignee = (assignee: string) => {
    onUpdate(subtask.id, { assignee });
    setShowAssigneeMenu(false);
  };

  const setDueDate = (date: string) => {
    onUpdate(subtask.id, { dueDate: date });
    setShowDatePicker(false);
  };

  return (
    <div
      className="group bg-white border border-slate-200 rounded-lg hover:shadow-md transition-all"
      data-testid="task-item"
    >
      <div className="flex items-center gap-3 p-3">
        {/* Chevron - צד ימין ביותר, פונה שמאלה */}
        {subtask.indent === 0 && (
          <button
            onClick={() => onToggleExpand?.(subtask.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label={subtask.isExpanded ? 'כווץ' : 'הרחב'}
          >
            <motion.div
              animate={{ rotate: subtask.isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </button>
        )}

        {/* Spacer for child items without chevron */}
        {subtask.indent === 1 && (
          <div className="min-w-[44px] flex-shrink-0" />
        )}

        {/* Checkbox - אחרי החץ */}
        <button
          onClick={() => onToggle(subtask.id)}
          className="relative w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center hover:border-[#0B3B5A] transition-colors flex-shrink-0"
          aria-label={subtask.completed ? 'בטל סימון משימה' : 'סמן משימה כהושלמה'}
        >
          {subtask.completed && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-4 h-4 text-[#0B3B5A]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          )}
        </button>

        {/* Title - אחרי הצ'קבוקס */}
        <div className="flex-1 text-right min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSave}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              className="w-full px-2 py-1 border border-[#0B3B5A] rounded focus:outline-none text-right"
              autoFocus
              dir="auto"
            />
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              className={`cursor-text ${
                subtask.completed ? 'line-through text-slate-400' : 'text-slate-700'
              }`}
              dir="auto"
            >
              {subtask.title}
            </span>
          )}
        </div>

        {/* Assignee - אחרי הטקסט */}
        <div className="w-8 flex items-center justify-center flex-shrink-0">
          {subtask.assignee && (
            <div className="w-6 h-6 rounded-full bg-[#D07655] flex items-center justify-center text-white text-xs">
              {subtask.assignee.split(' ').map(n => n[0]).join('')}
            </div>
          )}
        </div>

        {/* Due Date - אחרי האחראי, רוחב קבוע */}
        <div className="w-24 flex items-center justify-start gap-1 text-slate-500 text-xs flex-shrink-0">
          {subtask.dueDate && (
            <>
              <span>{new Date(subtask.dueDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}</span>
              <Calendar className="w-3 h-3" />
            </>
          )}
        </div>

        {/* Priority Badge - שמאל קיצוני, רוחב קבוע */}
        <div className="w-20 flex items-center justify-start flex-shrink-0">
          {subtask.priority && (
            <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(subtask.priority)}`}>
              {getPriorityLabel(subtask.priority)}
            </span>
          )}
        </div>

        {/* Delete Button - צד שמאל */}
        <button
          onClick={() => onDelete(subtask.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 p-1 rounded min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
          aria-label="מחק משימה"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Drag Handle - קצה שמאל */}
        <div className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-label="גרור">
          <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      </div>

      {/* Action Buttons Row - מתחת לכל משימה */}
      <div className="px-3 pb-3 flex gap-2 justify-end border-t border-slate-100 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Priority Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            className="text-[#0B3B5A] hover:bg-[#0B3B5A]/10 px-3 py-1.5 rounded-lg transition-colors text-sm min-h-[44px] flex items-center gap-1"
            data-testid={`set-priority-${subtask.id}`}
            aria-label="הגדר חשיבות"
          >
            <Tag className="w-4 h-4" />
            <span>הגדר חשיבות</span>
          </button>
          
          <AnimatePresence>
            {showPriorityMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]"
                dir="rtl"
              >
                <div className="py-1">
                  <button
                    onClick={() => setPriority('high')}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>גבוהה</span>
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  </button>
                  <button
                    onClick={() => setPriority('medium')}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>בינונית</span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  </button>
                  <button
                    onClick={() => setPriority('low')}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>נמוכה</span>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  </button>
                  <div className="border-t border-slate-200 my-1"></div>
                  <button
                    onClick={() => {
                      const customTag = prompt('הזן שם תגית מותאמת אישית:');
                      if (customTag) {
                        // For now, we'll treat custom tags as 'medium' priority
                        // In a full implementation, you'd extend the interface
                        alert('תגיות מותאמות אישית יתווספו בהמשך הפיתוח');
                      }
                      setShowPriorityMenu(false);
                    }}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 text-[#D07655] flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>+ הוסף תגית מותאמת</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Assignee Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
            className="text-[#0B3B5A] hover:bg-[#0B3B5A]/10 px-3 py-1.5 rounded-lg transition-colors text-sm min-h-[44px] flex items-center gap-1"
            data-testid={`set-assignee-${subtask.id}`}
            aria-label="הוסף אחראי"
          >
            <User className="w-4 h-4" />
            <span>הוסף אחראי</span>
          </button>
          
          <AnimatePresence>
            {showAssigneeMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]"
                dir="rtl"
              >
                <div className="py-1">
                  <button
                    onClick={() => setAssignee('שרה מ.')}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>שרה מ.</span>
                    <div className="w-6 h-6 rounded-full bg-[#D07655] flex items-center justify-center text-white text-xs">שמ</div>
                  </button>
                  <button
                    onClick={() => setAssignee('יוחנן ד.')}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>יוחנן ד.</span>
                    <div className="w-6 h-6 rounded-full bg-[#0B3B5A] flex items-center justify-center text-white text-xs">יד</div>
                  </button>
                  <button
                    onClick={() => setAssignee('מיכאל ר.')}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>מיכאל ר.</span>
                    <div className="w-6 h-6 rounded-full bg-[#D07655] flex items-center justify-center text-white text-xs">מר</div>
                  </button>
                  <button
                    onClick={() => setAssignee('אמה ל.')}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>אמה ל.</span>
                    <div className="w-6 h-6 rounded-full bg-[#0B3B5A] flex items-center justify-center text-white text-xs">אל</div>
                  </button>
                  <div className="border-t border-slate-200 my-1"></div>
                  <button
                    onClick={() => {
                      const newAssignee = prompt('הזן שם אחראי חדש:');
                      if (newAssignee) {
                        setAssignee(newAssignee);
                      }
                      setShowAssigneeMenu(false);
                    }}
                    className="w-full px-4 py-2 text-right hover:bg-slate-50 text-[#D07655] flex items-center justify-end gap-2 min-h-[44px]"
                  >
                    <span>+ הוסף אחראי חדש</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Date Picker Button */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="text-[#0B3B5A] hover:bg-[#0B3B5A]/10 px-3 py-1.5 rounded-lg transition-colors text-sm min-h-[44px] flex items-center gap-1"
            data-testid={`set-due-date-${subtask.id}`}
            aria-label="קבע תאריך יעד"
          >
            <Calendar className="w-4 h-4" />
            <span>קבע תאריך</span>
          </button>
          
          <AnimatePresence>
            {showDatePicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-4 min-w-[200px]"
                dir="rtl"
              >
                <div className="space-y-2">
                  <input
                    type="date"
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3B5A]"
                    dir="rtl"
                  />
                  <p className="text-xs text-slate-500 text-center">לוח שנה מלא יתווסף בהמשך</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}