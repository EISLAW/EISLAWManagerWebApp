import { useState } from 'react';
import { TaskModal } from './components/TaskModal';

export default function App() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-[#0B3B5A] mb-4">מערכת ניהול משימות</h1>
          <p className="text-slate-600">ניהול פרויקטים מקצועי עם משימות היררכיות ותכונות חכמות</p>
        </div>

        {/* Task Management Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-[#0B3B5A] mb-4 text-right">לוח ניהול פרויקטים</h2>
          <p className="text-slate-600 mb-6 text-right">
            נהל את הפרויקטים שלך עם תת-משימות היררכיות, נכסים, תגיות עדיפות, 
            ותובנות מבוססות AI בהשראת כלי ניהול פרויקטים מובילים.
          </p>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="w-full bg-[#0B3B5A] text-white px-6 py-3 rounded-lg hover:bg-[#0B3B5A]/90 transition-colors flex items-center justify-center gap-2"
          >
            <span>פתח לוח משימות</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
    </div>
  );
}