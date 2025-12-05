import { useState, useRef } from 'react';
import { X, Plus, Calendar, User, Tag, Mail, ThumbsUp, MessageCircle, CheckCircle } from 'lucide-react';
import { SubtaskItem } from './SubtaskItem';
import { AssetItem } from './AssetItem';
import { AttachEmailModal } from './AttachEmailModal';
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

interface Asset {
  id: string;
  type: 'folder' | 'file' | 'link' | 'email';
  name: string;
  url?: string;
  fileType?: string;
  emailFrom?: string;
  emailSubject?: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskModal({ isOpen, onClose }: TaskModalProps) {
  const [mainTaskTitle, setMainTaskTitle] = useState('השקת קמפיין שיווקי רבעון 4');
  const [taskDueDate, setTaskDueDate] = useState('2025-11-20');
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [mainTaskAssignee, setMainTaskAssignee] = useState('שרה מ.');
  const [showMainAssigneeMenu, setShowMainAssigneeMenu] = useState(false);
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string }>>([
    { id: '1', name: 'Q4', color: '#D07655' },
    { id: '2', name: 'שיווק', color: '#0B3B5A' },
  ]);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: string;
    author: string;
    text: string;
    timestamp: string;
    resolved: boolean;
    likes: number;
    replies: Array<{ 
      id: string; 
      author: string; 
      text: string; 
      timestamp: string;
      resolved: boolean;
      likes: number;
      showReplyInput: boolean;
      replies: Array<{ 
        id: string; 
        author: string; 
        text: string; 
        timestamp: string;
        resolved: boolean;
        likes: number;
      }>;
    }>;
    showReplyInput: boolean;
  }>>([
    {
      id: 'c1',
      author: 'שרה מ.',
      text: 'התקדמות מצוינת בשלב המחקר! בואו נקבע פגישה סקירה.',
      timestamp: 'לפני שעתיים',
      resolved: false,
      likes: 2,
      replies: [
        {
          id: 'r1',
          author: 'יוחנן ד.',
          text: 'מעולה! אני זמין מחר בבוקר.',
          timestamp: 'לפני שעה',
          resolved: false,
          likes: 1,
          showReplyInput: false,
          replies: [],
        },
      ],
      showReplyInput: false,
    },
  ]);
  const [newComment, setNewComment] = useState('');
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [subtasks, setSubtasks] = useState<Subtask[]>([
    {
      id: '1',
      title: 'מחקר ותכנון',
      completed: true,
      dueDate: '2025-11-10',
      assignee: 'שרה מ.',
      priority: 'high',
      indent: 0,
      isExpanded: false,
    },
    {
      id: '2',
      title: 'ניתוח מתחרים',
      completed: true,
      assignee: 'יוחנן ד.',
      indent: 1,
    },
    {
      id: '3',
      title: 'הגדרת קהל יעד',
      completed: true,
      assignee: 'שרה מ.',
      indent: 1,
    },
    {
      id: '4',
      title: 'יצירת תוכן',
      completed: false,
      dueDate: '2025-11-15',
      assignee: 'מיכאל ר.',
      priority: 'high',
      indent: 0,
      isExpanded: false,
    },
    {
      id: '5',
      title: 'כתיבת פוסטים לבלוג',
      completed: false,
      assignee: 'אמה ל.',
      priority: 'medium',
      indent: 1,
    },
    {
      id: '6',
      title: 'עיצוב גרפיקה לרשתות חברתיות',
      completed: false,
      assignee: 'מיכאל ר.',
      priority: 'medium',
      indent: 1,
    },
    {
      id: '7',
      title: 'ביצוע קמפיין',
      completed: false,
      dueDate: '2025-11-20',
      priority: 'low',
      indent: 0,
      isExpanded: false,
    },
  ]);

  const [assets, setAssets] = useState<Asset[]>([
    {
      id: 'a1',
      type: 'folder',
      name: 'נכסי קמפיין',
      url: '#',
    },
    {
      id: 'a2',
      type: 'file',
      name: 'Marketing_Strategy_2025.pdf',
      fileType: 'pdf',
      url: '#',
    },
    {
      id: 'a3',
      type: 'file',
      name: 'Budget_Analysis.xlsx',
      fileType: 'xlsx',
      url: '#',
    },
    {
      id: 'a4',
      type: 'link',
      name: 'לוח מחקר מתחרים',
      url: 'https://example.com',
    },
    {
      id: 'a5',
      type: 'email',
      name: 'אישור תקציב מהנהלה',
      emailFrom: 'ceo@company.com',
      emailSubject: 'Re: אישור תקציב Q4',
      url: '#',
    },
  ]);

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAttachEmail, setShowAttachEmail] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<{[key: string]: string}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedCount = subtasks.filter(st => st.completed).length;
  const progress = (completedCount / subtasks.length) * 100;

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(st => 
      st.id === id ? { ...st, completed: !st.completed } : st
    ));
  };

  const toggleExpanded = (id: string) => {
    setSubtasks(subtasks.map(st => 
      st.id === id ? { ...st, isExpanded: !st.isExpanded } : st
    ));
  };

  const addSubtask = (parentId: string) => {
    const inputValue = newSubtaskInputs[parentId];
    if (!inputValue?.trim()) return;
    
    const parentIndex = subtasks.findIndex(st => st.id === parentId);
    if (parentIndex === -1) return;
    
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: inputValue,
      completed: false,
      indent: 1,
    };
    
    // Find where to insert (after all children of this parent)
    let insertIndex = parentIndex + 1;
    while (insertIndex < subtasks.length && subtasks[insertIndex].indent > 0) {
      insertIndex++;
    }
    
    const newSubtasks = [...subtasks];
    newSubtasks.splice(insertIndex, 0, newSubtask);
    setSubtasks(newSubtasks);
    
    // Clear input
    setNewSubtaskInputs({...newSubtaskInputs, [parentId]: ''});
  };

  const deleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const updateSubtask = (id: string, updates: Partial<Subtask>) => {
    setSubtasks(subtasks.map(st => 
      st.id === id ? { ...st, ...updates } : st
    ));
  };

  const addAsset = (type: 'folder' | 'file' | 'link' | 'email', name: string, fileType?: string) => {
    const newAsset: Asset = {
      id: Date.now().toString(),
      type,
      name,
      fileType,
      url: '#',
    };
    setAssets([...assets, newAsset]);
  };

  const deleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSubtasks = [...subtasks];
    const draggedItem = newSubtasks[draggedIndex];
    newSubtasks.splice(draggedIndex, 1);
    newSubtasks.splice(index, 0, draggedItem);
    
    setSubtasks(newSubtasks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getPriorityColor = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      case 'low': return 'נמוכה';
      default: return '';
    }
  };

  const handleAttachEmail = (emailData: any) => {
    const newEmail: Asset = {
      id: Date.now().toString(),
      type: 'email',
      name: emailData.subject,
      emailFrom: emailData.from,
      emailSubject: emailData.subject,
      url: '#',
    };
    setAssets([...assets, newEmail]);
    setShowAttachEmail(false);
  };

  // Get children of a parent task
  const getChildren = (parentId: string) => {
    const parentIndex = subtasks.findIndex(st => st.id === parentId);
    if (parentIndex === -1) return [];
    
    const children: Subtask[] = [];
    for (let i = parentIndex + 1; i < subtasks.length; i++) {
      if (subtasks[i].indent === 0) break;
      if (subtasks[i].indent === 1) children.push(subtasks[i]);
    }
    return children;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          style={{ fontFamily: '"Noto Sans Hebrew", sans-serif' }}
          data-testid="task-modal"
        >
          {/* Header */}
          <div className="bg-[#0B3B5A] text-white px-8 py-6 flex items-center justify-between">
            <button
              onClick={onClose}
              className="ml-4 hover:bg-white/10 p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              data-testid="close-modal"
              aria-label="סגור"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={mainTaskTitle}
                onChange={(e) => setMainTaskTitle(e.target.value)}
                className="bg-transparent border-none outline-none text-white w-full text-right"
                data-testid="task-title"
                aria-label="כותרת משימה"
              />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-8 py-4 bg-slate-50 border-b border-slate-200" data-testid="progress">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#0B3B5A]">{completedCount} מתוך {subtasks.length} הושלמו</span>
              <span className="text-slate-600">התקדמות</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-l from-[#0B3B5A] to-[#D07655] float-right"
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-6 p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Right Column - Tasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#0B3B5A] text-right font-bold">משימות</h3>
                <button
                  onClick={() => {
                    const newTask: Subtask = {
                      id: Date.now().toString(),
                      title: 'משימה חשה',
                      completed: false,
                      indent: 0,
                      isExpanded: false,
                    };
                    setSubtasks([...subtasks, newTask]);
                  }}
                  className="text-[#D07655] hover:text-[#D07655]/80 transition-colors flex items-center gap-1 min-h-[44px]"
                  data-testid="add-task-btn"
                  aria-label="הוסף משימה"
                >
                  <span>הוסף משימה +</span>
                </button>
              </div>

              {/* Subtasks */}
              <div className="space-y-2" data-testid="task-list">
                {subtasks.map((subtask, index) => {
                  // Only show parent tasks (indent = 0) in main list
                  if (subtask.indent !== 0) return null;
                  
                  const children = getChildren(subtask.id);
                  
                  return (
                    <div key={subtask.id}>
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                      >
                        <SubtaskItem
                          subtask={subtask}
                          onToggle={toggleSubtask}
                          onDelete={deleteSubtask}
                          onUpdate={updateSubtask}
                          onToggleExpand={toggleExpanded}
                          getPriorityColor={getPriorityColor}
                          getPriorityLabel={getPriorityLabel}
                          hasChildren={children.length > 0}
                        />
                      </motion.div>

                      {/* Children and Add Subtask */}
                      {subtask.isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mr-8 mt-2 space-y-2"
                        >
                          {/* Child tasks */}
                          {children.map((child) => (
                            <SubtaskItem
                              key={child.id}
                              subtask={child}
                              onToggle={toggleSubtask}
                              onDelete={deleteSubtask}
                              onUpdate={updateSubtask}
                              onToggleExpand={toggleExpanded}
                              getPriorityColor={getPriorityColor}
                              getPriorityLabel={getPriorityLabel}
                              hasChildren={false}
                            />
                          ))}

                          {/* Add Subtask Input */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => addSubtask(subtask.id)}
                              className="bg-[#D07655] text-white p-2 rounded-lg hover:bg-[#D07655]/90 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                              data-testid={`add-child-${subtask.id}`}
                              aria-label="הוסף תת-משימה"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                            <input
                              type="text"
                              value={newSubtaskInputs[subtask.id] || ''}
                              onChange={(e) => setNewSubtaskInputs({...newSubtaskInputs, [subtask.id]: e.target.value})}
                              onKeyPress={(e) => e.key === 'Enter' && addSubtask(subtask.id)}
                              placeholder="הוסף תת-משימה"
                              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3B5A] focus:border-transparent text-right"
                              data-testid={`subtask-input-${subtask.id}`}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Left Column - Assets & Details */}
            <div>
              {/* Assets Section Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#0B3B5A] text-right font-bold">נכסים</h3>
                <button
                  onClick={() => setShowAddAsset(!showAddAsset)}
                  className="text-[#D07655] hover:text-[#D07655]/80 transition-colors flex items-center gap-1 min-h-[44px]"
                  data-testid="add-data-btn"
                  aria-label="הוסף נתונים"
                >
                  <span>הוסף נתונים +</span>
                </button>
              </div>

              {/* Add Asset Options - Outside of assets list */}
              <AnimatePresence>
                {showAddAsset && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg"
                    data-testid="asset-actions"
                  >
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => {
                          addAsset('file', 'קובץ חדש.pdf', 'pdf');
                          setShowAddAsset(false);
                        }}
                        className="p-3 bg-white border border-slate-300 rounded-lg hover:border-[#0B3B5A] transition-colors flex flex-col items-center gap-2 min-h-[44px]"
                        data-testid="add-file"
                        aria-label="קובץ"
                      >
                        <span>📄</span>
                        <span className="text-sm">קובץ</span>
                      </button>
                      <button
                        onClick={() => {
                          const url = prompt('הזן קישור:');
                          if (url) {
                            addAsset('link', url);
                          }
                          setShowAddAsset(false);
                        }}
                        className="p-3 bg-white border border-slate-300 rounded-lg hover:border-[#0B3B5A] transition-colors flex flex-col items-center gap-2 min-h-[44px]"
                        data-testid="add-link"
                        aria-label="לינק"
                      >
                        <span>🔗</span>
                        <span className="text-sm">לינק</span>
                      </button>
                      <button
                        onClick={() => {
                          addAsset('folder', 'תיקייה חדשה');
                          setShowAddAsset(false);
                        }}
                        className="p-3 bg-white border border-slate-300 rounded-lg hover:border-[#0B3B5A] transition-colors flex flex-col items-center gap-2 min-h-[44px]"
                        data-testid="add-folder"
                        aria-label="תיקייה"
                      >
                        <span>📁</span>
                        <span className="text-sm">תיקייה</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowAttachEmail(true);
                          setShowAddAsset(false);
                        }}
                        className="p-3 bg-white border border-slate-300 rounded-lg hover:border-[#0B3B5A] transition-colors flex flex-col items-center gap-2 min-h-[44px]"
                        data-testid="add-email"
                        aria-label="אימייל"
                      >
                        <Mail className="w-5 h-5" />
                        <span className="text-sm">אימייל</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Assets List */}
              <div className="space-y-2 mb-6">
                {assets.map((asset) => (
                  <AssetItem
                    key={asset.id}
                    asset={asset}
                    onDelete={deleteAsset}
                  />
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const ext = file.name.split('.').pop();
                    addAsset('file', file.name, ext);
                  }
                }}
              />

              {/* Details Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#0B3B5A] text-right font-bold">פרטים</h3>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDueDatePicker(!showDueDatePicker)}
                        className="hover:bg-slate-200 p-1 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        data-testid="due-date"
                        aria-label="תאריך יעד"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      <span>{new Date(taskDueDate).toLocaleDateString('he-IL')}</span>
                    </div>
                    <span className="font-medium">תאריך יעד</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          alert('סנכרון ליומן - פונקציונליות תתווסף בהמשך');
                        }}
                        className="hover:bg-slate-200 p-1 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        data-testid="sync-calendar"
                        aria-label="סנכרון ליומן"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      <span className="text-sm">לחץ לסנכרון</span>
                    </div>
                    <span className="font-medium">סנכרון ליומן</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700" data-testid="owner">
                    <div className="relative flex items-center gap-2">
                      <button
                        onClick={() => setShowMainAssigneeMenu(!showMainAssigneeMenu)}
                        className="hover:bg-slate-200 p-1 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        data-testid="assignee"
                        aria-label="אחראי"
                      >
                        <User className="w-4 h-4" />
                      </button>
                      <span>{mainTaskAssignee}</span>
                      
                      <AnimatePresence>
                        {showMainAssigneeMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 top-10 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]"
                            dir="rtl"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setMainTaskAssignee('שרה מ.');
                                  setShowMainAssigneeMenu(false);
                                }}
                                className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                              >
                                <span>שרה מ.</span>
                                <div className="w-6 h-6 rounded-full bg-[#D07655] flex items-center justify-center text-white text-xs">שמ</div>
                              </button>
                              <button
                                onClick={() => {
                                  setMainTaskAssignee('יוחנן ד.');
                                  setShowMainAssigneeMenu(false);
                                }}
                                className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                              >
                                <span>יוחנן ד.</span>
                                <div className="w-6 h-6 rounded-full bg-[#0B3B5A] flex items-center justify-center text-white text-xs">יד</div>
                              </button>
                              <button
                                onClick={() => {
                                  setMainTaskAssignee('מיכאל ר.');
                                  setShowMainAssigneeMenu(false);
                                }}
                                className="w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center justify-end gap-2 min-h-[44px]"
                              >
                                <span>מיכאל ר.</span>
                                <div className="w-6 h-6 rounded-full bg-[#D07655] flex items-center justify-center text-white text-xs">מר</div>
                              </button>
                              <button
                                onClick={() => {
                                  setMainTaskAssignee('אמה ל.');
                                  setShowMainAssigneeMenu(false);
                                }}
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
                                    setMainTaskAssignee(newAssignee);
                                  }
                                  setShowMainAssigneeMenu(false);
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
                    <span className="font-medium">אחראי</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700" data-testid="tags">
                    <div className="relative flex-1">
                      <div className="flex gap-1 items-center justify-start">
                        {tags.map((tag) => (
                          <div
                            key={tag.id}
                            className="px-2 py-1 text-white rounded text-xs flex items-center gap-1 group"
                            style={{ backgroundColor: tag.color }}
                          >
                            <button
                              onClick={() => setTags(tags.filter(t => t.id !== tag.id))}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                              aria-label={`הסר תגית ${tag.name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span>{tag.name}</span>
                          </div>
                        ))}
                        <button
                          onClick={() => setShowTagsMenu(!showTagsMenu)}
                          className="text-[#D07655] hover:bg-[#D07655]/10 px-2 py-1 rounded text-xs flex items-center gap-1 min-h-[44px]"
                          aria-label="הוסף תגית"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {showTagsMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[250px]"
                            dir="rtl"
                          >
                            <div className="py-2 px-3">
                              <p className="text-sm text-slate-600 mb-2">הוסף תגית חדשה</p>
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  id="tag-name"
                                  placeholder="שם התגית"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3B5A] text-sm text-right"
                                />
                                <div className="flex gap-2 items-center justify-end">
                                  <label htmlFor="tag-color" className="text-sm">צבע:</label>
                                  <input
                                    type="color"
                                    id="tag-color"
                                    defaultValue="#0B3B5A"
                                    className="w-12 h-8 border border-slate-300 rounded cursor-pointer"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    const nameInput = document.getElementById('tag-name') as HTMLInputElement;
                                    const colorInput = document.getElementById('tag-color') as HTMLInputElement;
                                    if (nameInput?.value) {
                                      setTags([...tags, {
                                        id: Date.now().toString(),
                                        name: nameInput.value,
                                        color: colorInput?.value || '#0B3B5A',
                                      }]);
                                      nameInput.value = '';
                                      setShowTagsMenu(false);
                                    }
                                  }}
                                  className="w-full bg-[#D07655] text-white px-3 py-2 rounded-lg hover:bg-[#D07655]/90 transition-colors min-h-[44px]"
                                >
                                  הוסף תגית
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="font-medium">תגיות</span>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div data-testid="comments">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#0B3B5A] text-right font-bold">תגובות</h3>
                </div>
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg" data-testid="comment-item">
                      <div className="flex items-center gap-2 mb-1 justify-end">
                        <span className="text-slate-900">{comment.author}</span>
                        <div className="w-6 h-6 rounded-full bg-[#D07655] flex items-center justify-center text-white text-xs">
                          {comment.author.slice(0, 2)}
                        </div>
                        <span className="text-slate-500 text-xs">{comment.timestamp}</span>
                      </div>
                      <p className="text-slate-700 text-sm text-right mb-2">
                        {comment.text}
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 justify-end mt-2">
                        <button
                          onClick={() => {
                            setComments(comments.map(c => 
                              c.id === comment.id ? { ...c, showReplyInput: !comment.showReplyInput } : c
                            ));
                          }}
                          className="text-xs text-slate-500 hover:text-[#0B3B5A] transition-colors flex items-center gap-1 min-h-[44px]"
                          data-testid={`reply-comment-${comment.id}`}
                          aria-label="תגובה לתגובה"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>תשובה</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setComments(comments.map(c => 
                              c.id === comment.id ? { ...c, resolved: !comment.resolved } : c
                            ));
                          }}
                          className={`text-xs ${comment.resolved ? 'text-green-600' : 'text-slate-500'} hover:text-green-600 transition-colors flex items-center gap-1 min-h-[44px]`}
                          data-testid={`resolve-comment-${comment.id}`}
                          aria-label={comment.resolved ? 'ביטול פתירה' : 'סמן כפתור'}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{comment.resolved ? 'נפתר ✓' : 'סמן כנפתר'}</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const newLikes = comment.likes + 1;
                            setComments(comments.map(c => 
                              c.id === comment.id ? { ...c, likes: newLikes } : c
                            ));
                          }}
                          className="text-xs text-slate-500 hover:text-[#D07655] transition-colors flex items-center gap-1 min-h-[44px]"
                          data-testid={`like-comment-${comment.id}`}
                          aria-label="אהבתי"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{comment.likes > 0 && comment.likes}</span>
                        </button>
                      </div>

                      {/* Reply Input */}
                      <AnimatePresence>
                        {comment.showReplyInput && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3"
                          >
                            <textarea
                              placeholder="כתוב תשובה..."
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3B5A] focus:border-transparent resize-none text-right text-sm"
                              rows={2}
                              value={replyTexts[comment.id] || ''}
                              onChange={(e) => setReplyTexts({...replyTexts, [comment.id]: e.target.value})}
                            />
                            <div className="flex gap-2 justify-start mt-2">
                              <button
                                onClick={() => {
                                  const replyText = replyTexts[comment.id];
                                  if (replyText?.trim()) {
                                    const newReplies = [...comment.replies, {
                                      id: Date.now().toString(),
                                      author: 'שרה מ.',
                                      text: replyText,
                                      timestamp: 'לפני רגעים',
                                      resolved: false,
                                      likes: 0,
                                      showReplyInput: false,
                                      replies: [],
                                    }];
                                    setComments(comments.map(c => 
                                      c.id === comment.id ? { ...c, replies: newReplies, showReplyInput: false } : c
                                    ));
                                    setReplyTexts({...replyTexts, [comment.id]: ''});
                                  }
                                }}
                                className="bg-[#D07655] text-white px-4 py-2 rounded-lg hover:bg-[#D07655]/90 transition-colors text-sm min-h-[44px]"
                                data-testid={`post-reply-${comment.id}`}
                              >
                                פרסם תשובה
                              </button>
                              <button
                                onClick={() => {
                                  setComments(comments.map(c => 
                                    c.id === comment.id ? { ...c, showReplyInput: false } : c
                                  ));
                                  setReplyTexts({...replyTexts, [comment.id]: ''});
                                }}
                                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors text-sm min-h-[44px]"
                              >
                                ביטול
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <div className="mt-3 space-y-2 mr-6">
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="p-3 bg-slate-100 border border-slate-200 rounded-lg ml-8" data-testid="reply-item">
                              <div className="flex items-center gap-2 mb-1 justify-end">
                                <span className="text-slate-900">{reply.author}</span>
                                <div className="w-6 h-6 rounded-full bg-[#D07655] flex items-center justify-center text-white text-xs">
                                  {reply.author.slice(0, 2)}
                                </div>
                                <span className="text-slate-500 text-xs">{reply.timestamp}</span>
                              </div>
                              <p className="text-slate-700 text-sm text-right mb-2">
                                {reply.text}
                              </p>
                              
                              {/* Reply Action Buttons */}
                              <div className="flex items-center gap-3 justify-end mt-2">
                                <button
                                  onClick={() => {
                                    setComments(comments.map(c => {
                                      if (c.id === comment.id) {
                                        return {
                                          ...c,
                                          replies: c.replies.map(r => 
                                            r.id === reply.id ? { ...r, showReplyInput: !r.showReplyInput } : r
                                          )
                                        };
                                      }
                                      return c;
                                    }));
                                  }}
                                  className="text-xs text-slate-500 hover:text-[#0B3B5A] transition-colors flex items-center gap-1 min-h-[44px]"
                                  data-testid={`reply-to-reply-${reply.id}`}
                                  aria-label="תשובה לתשובה"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>תשובה</span>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setComments(comments.map(c => {
                                      if (c.id === comment.id) {
                                        return {
                                          ...c,
                                          replies: c.replies.map(r => 
                                            r.id === reply.id ? { ...r, resolved: !r.resolved } : r
                                          )
                                        };
                                      }
                                      return c;
                                    }));
                                  }}
                                  className={`text-xs ${reply.resolved ? 'text-green-600' : 'text-slate-500'} hover:text-green-600 transition-colors flex items-center gap-1 min-h-[44px]`}
                                  data-testid={`resolve-reply-${reply.id}`}
                                  aria-label={reply.resolved ? 'ביטול פתירה' : 'סמן כנפתר'}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>{reply.resolved ? 'נפתר ✓' : 'סמן כנפתר'}</span>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setComments(comments.map(c => {
                                      if (c.id === comment.id) {
                                        return {
                                          ...c,
                                          replies: c.replies.map(r => 
                                            r.id === reply.id ? { ...r, likes: r.likes + 1 } : r
                                          )
                                        };
                                      }
                                      return c;
                                    }));
                                  }}
                                  className="text-xs text-slate-500 hover:text-[#D07655] transition-colors flex items-center gap-1 min-h-[44px]"
                                  data-testid={`like-reply-${reply.id}`}
                                  aria-label="אהבתי"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  <span>{reply.likes > 0 && reply.likes}</span>
                                </button>
                              </div>

                              {/* Reply to Reply Input */}
                              <AnimatePresence>
                                {reply.showReplyInput && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3"
                                  >
                                    <textarea
                                      placeholder="כתוב תשובה..."
                                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3B5A] focus:border-transparent resize-none text-right text-sm"
                                      rows={2}
                                      value={replyTexts[`${comment.id}-${reply.id}`] || ''}
                                      onChange={(e) => setReplyTexts({...replyTexts, [`${comment.id}-${reply.id}`]: e.target.value})}
                                    />
                                    <div className="flex gap-2 justify-start mt-2">
                                      <button
                                        onClick={() => {
                                          const replyText = replyTexts[`${comment.id}-${reply.id}`];
                                          if (replyText?.trim()) {
                                            setComments(comments.map(c => {
                                              if (c.id === comment.id) {
                                                return {
                                                  ...c,
                                                  replies: c.replies.map(r => {
                                                    if (r.id === reply.id) {
                                                      return {
                                                        ...r,
                                                        replies: [...r.replies, {
                                                          id: Date.now().toString(),
                                                          author: 'שרה מ.',
                                                          text: replyText,
                                                          timestamp: 'לפני רגעים',
                                                          resolved: false,
                                                          likes: 0,
                                                        }],
                                                        showReplyInput: false,
                                                      };
                                                    }
                                                    return r;
                                                  })
                                                };
                                              }
                                              return c;
                                            }));
                                            setReplyTexts({...replyTexts, [`${comment.id}-${reply.id}`]: ''});
                                          }
                                        }}
                                        className="bg-[#D07655] text-white px-4 py-2 rounded-lg hover:bg-[#D07655]/90 transition-colors text-sm min-h-[44px]"
                                        data-testid={`post-nested-reply-${reply.id}`}
                                      >
                                        פרסם תשובה
                                      </button>
                                      <button
                                        onClick={() => {
                                          setComments(comments.map(c => {
                                            if (c.id === comment.id) {
                                              return {
                                                ...c,
                                                replies: c.replies.map(r => 
                                                  r.id === reply.id ? { ...r, showReplyInput: false } : r
                                                )
                                              };
                                            }
                                            return c;
                                          }));
                                          setReplyTexts({...replyTexts, [`${comment.id}-${reply.id}`]: ''});
                                        }}
                                        className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors text-sm min-h-[44px]"
                                      >
                                        ביטול
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Nested Replies (Replies to Replies) */}
                              {reply.replies.length > 0 && (
                                <div className="mt-3 space-y-2 mr-6">
                                  {reply.replies.map(nestedReply => (
                                    <div key={nestedReply.id} className="p-3 bg-white border border-slate-200 rounded-lg ml-8" data-testid="nested-reply-item">
                                      <div className="flex items-center gap-2 mb-1 justify-end">
                                        <span className="text-slate-900">{nestedReply.author}</span>
                                        <div className="w-6 h-6 rounded-full bg-[#0B3B5A] flex items-center justify-center text-white text-xs">
                                          {nestedReply.author.slice(0, 2)}
                                        </div>
                                        <span className="text-slate-500 text-xs">{nestedReply.timestamp}</span>
                                      </div>
                                      <p className="text-slate-700 text-sm text-right mb-2">
                                        {nestedReply.text}
                                      </p>
                                      
                                      {/* Nested Reply Action Buttons */}
                                      <div className="flex items-center gap-3 justify-end mt-2">
                                        <button
                                          onClick={() => {
                                            setComments(comments.map(c => {
                                              if (c.id === comment.id) {
                                                return {
                                                  ...c,
                                                  replies: c.replies.map(r => {
                                                    if (r.id === reply.id) {
                                                      return {
                                                        ...r,
                                                        replies: r.replies.map(nr => 
                                                          nr.id === nestedReply.id ? { ...nr, resolved: !nr.resolved } : nr
                                                        )
                                                      };
                                                    }
                                                    return r;
                                                  })
                                                };
                                              }
                                              return c;
                                            }));
                                          }}
                                          className={`text-xs ${nestedReply.resolved ? 'text-green-600' : 'text-slate-500'} hover:text-green-600 transition-colors flex items-center gap-1 min-h-[44px]`}
                                          data-testid={`resolve-nested-reply-${nestedReply.id}`}
                                          aria-label={nestedReply.resolved ? 'ביטול פתירה' : 'סמן כנפתר'}
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                          <span>{nestedReply.resolved ? 'נפתר ✓' : 'סמן כנפתר'}</span>
                                        </button>
                                        
                                        <button
                                          onClick={() => {
                                            setComments(comments.map(c => {
                                              if (c.id === comment.id) {
                                                return {
                                                  ...c,
                                                  replies: c.replies.map(r => {
                                                    if (r.id === reply.id) {
                                                      return {
                                                        ...r,
                                                        replies: r.replies.map(nr => 
                                                          nr.id === nestedReply.id ? { ...nr, likes: nr.likes + 1 } : nr
                                                        )
                                                      };
                                                    }
                                                    return r;
                                                  })
                                                };
                                              }
                                              return c;
                                            }));
                                          }}
                                          className="text-xs text-slate-500 hover:text-[#D07655] transition-colors flex items-center gap-1 min-h-[44px]"
                                          data-testid={`like-nested-reply-${nestedReply.id}`}
                                          aria-label="אהבתי"
                                        >
                                          <ThumbsUp className="w-4 h-4" />
                                          <span>{nestedReply.likes > 0 && nestedReply.likes}</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="relative">
                    <textarea
                      placeholder="הוסף תגובה..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3B5A] focus:border-transparent resize-none text-right"
                      rows={3}
                      data-testid="comment-input"
                      aria-label="הוסף תגובה"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        const commentText = newComment;
                        if (commentText?.trim()) {
                          const newCommentId = Date.now().toString();
                          setComments([...comments, {
                            id: newCommentId,
                            author: 'שרה מ.',
                            text: commentText,
                            timestamp: 'לפני רגעים',
                            resolved: false,
                            likes: 0,
                            replies: [],
                            showReplyInput: false,
                          }]);
                          setNewComment('');
                        }
                      }}
                      className="mt-2 bg-[#D07655] text-white px-4 py-2 rounded-lg hover:bg-[#D07655]/90 transition-colors text-sm min-h-[44px]"
                      data-testid="post-comment-btn"
                      aria-label="פרסם תגובה"
                    >
                      פרסם תגובה
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Attach Email Modal */}
        <AttachEmailModal
          isOpen={showAttachEmail}
          onClose={() => setShowAttachEmail(false)}
          onAttach={handleAttachEmail}
        />
      </div>
    </AnimatePresence>
  );
}