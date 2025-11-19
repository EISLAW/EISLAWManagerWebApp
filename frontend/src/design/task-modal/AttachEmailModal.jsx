import React from 'react';
import { X, Search, Mail } from 'lucide-react';

export default function AttachEmailModal({ open, onClose }) {
  if (!open) return null;
  const emails = [
    { id: 'em1', subject: 'אישור הקריאייטיב', from: 'marketing@brand.com', date: '2025-11-05' },
    { id: 'em2', subject: 'עדכון תקציב', from: 'finance@brand.com', date: '2025-11-03' }
  ];
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl" data-testid="tm.attach-email">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-petrol text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">צרף אימייל</h3>
          <button className="hover:text-copper" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input className="flex-1 focus:outline-none" placeholder="Subject או כתובת" />
          </label>
          <div className="space-y-2 max-h-72 overflow-auto">
            {emails.map(email => (
              <div key={email.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-slate-900">{email.subject}</div>
                  <div className="text-slate-500">{email.from}</div>
                </div>
                <button className="px-3 py-1 rounded bg-petrol text-white text-xs" data-testid="tm.email.attach" data-action="email.attach">
                  צרף
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

