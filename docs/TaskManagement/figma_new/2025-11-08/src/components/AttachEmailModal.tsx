import { useState } from 'react';
import { X, Search, Mail, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttachEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (emailData: EmailData) => void;
}

interface EmailData {
  subject: string;
  from: string;
  received: string;
  savePdf: boolean;
  saveAttachments: boolean;
}

interface EmailResult {
  id: string;
  subject: string;
  from: string;
  received: string;
  hasAttachments: boolean;
}

export function AttachEmailModal({ isOpen, onClose, onAttach }: AttachEmailModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [savePdf, setSavePdf] = useState(true);
  const [saveAttachments, setSaveAttachments] = useState(true);

  // Mock email results
  const mockEmails: EmailResult[] = [
    {
      id: '1',
      subject: 'אישור תקציב Q4',
      from: 'ceo@company.com',
      received: '2025-11-07',
      hasAttachments: true,
    },
    {
      id: '2',
      subject: 'עדכון מצב פרויקט',
      from: 'project.manager@company.com',
      received: '2025-11-06',
      hasAttachments: false,
    },
    {
      id: '3',
      subject: 'Re: תכנון אסטרטגיה שיווקית',
      from: 'marketing@company.com',
      received: '2025-11-05',
      hasAttachments: true,
    },
  ];

  const filteredEmails = searchQuery
    ? mockEmails.filter(
        (email) =>
          email.subject.includes(searchQuery) ||
          email.from.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockEmails;

  const handleAttach = () => {
    if (!selectedEmail) return;

    const email = mockEmails.find((e) => e.id === selectedEmail);
    if (!email) return;

    onAttach({
      subject: email.subject,
      from: email.from,
      received: email.received,
      savePdf,
      saveAttachments,
    });

    // Reset
    setSearchQuery('');
    setSelectedEmail(null);
    setSavePdf(true);
    setSaveAttachments(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          style={{ fontFamily: '"Noto Sans Hebrew", sans-serif' }}
          data-testid="attach-email"
        >
          {/* Header */}
          <div className="bg-[#0B3B5A] text-white px-6 py-4 flex items-center justify-between">
            <button
              onClick={onClose}
              className="hover:bg-white/10 p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-white">צרף אימייל למשימה</h3>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-slate-200">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש לפי נושא או שולח..."
                className="w-full pr-12 pl-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3B5A] focus:border-transparent text-right"
                dir="auto"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Email Results */}
          <div className="max-h-96 overflow-y-auto p-6">
            <div className="space-y-2">
              {filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email.id)}
                  className={`w-full p-4 border rounded-lg transition-all text-right ${
                    selectedEmail === email.id
                      ? 'border-[#0B3B5A] bg-[#0B3B5A]/5'
                      : 'border-slate-200 hover:border-[#0B3B5A]/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        {email.hasAttachments && (
                          <Paperclip className="w-4 h-4 text-slate-400" />
                        )}
                        <h4 className="text-slate-900" dir="auto">{email.subject}</h4>
                      </div>
                      <div className="text-slate-500 text-sm text-right">
                        <div dir="ltr" className="inline">{email.from}</div>
                      </div>
                      <div className="text-slate-400 text-xs text-right">
                        {new Date(email.received).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    <Mail className="w-5 h-5 text-[#0B3B5A] flex-shrink-0" />
                  </div>
                </button>
              ))}

              {filteredEmails.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>לא נמצאו אימיילים</p>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
            <label className="flex items-center justify-end gap-3 cursor-pointer group">
              <span className="text-slate-700 group-hover:text-slate-900">שמור PDF</span>
              <input
                type="checkbox"
                checked={savePdf}
                onChange={(e) => setSavePdf(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#0B3B5A] focus:ring-[#0B3B5A] cursor-pointer"
                data-testid="attach-email-save-pdf"
              />
            </label>
            <label className="flex items-center justify-end gap-3 cursor-pointer group">
              <span className="text-slate-700 group-hover:text-slate-900">
                שמור קבצים מצורפים
              </span>
              <input
                type="checkbox"
                checked={saveAttachments}
                onChange={(e) => setSaveAttachments(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#0B3B5A] focus:ring-[#0B3B5A] cursor-pointer"
                data-testid="attach-email-save-attachments"
              />
            </label>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              ביטול
            </button>
            <button
              onClick={handleAttach}
              disabled={!selectedEmail}
              className="px-6 py-2 bg-[#0B3B5A] text-white rounded-lg hover:bg-[#0B3B5A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              צרף
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
