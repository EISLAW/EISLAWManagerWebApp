import React from "react"
import { FileText, FolderOpen, Send } from "lucide-react"

/**
 * QuickActions - Action buttons for client workflow
 * Accessible, RTL-aware action buttons
 */
export default function QuickActions({
  onQuote,
  onDocuments,
  onDelivery,
  disabled = false
}) {
  return (
    <section
      className="mb-6"
      data-testid="quick-actions-section"
      aria-label="פעולות מהירות"
    >
      <h3 className="text-sm font-medium text-gray-500 mb-3">פעולות מהירות</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label="כפתורי פעולות">
        <button
          onClick={onQuote}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="btn-quote"
          aria-label="הפק הצעת מחיר"
        >
          <FileText className="w-4 h-4 text-amber-600" aria-hidden="true" />
          <span className="text-sm font-medium">הצעת מחיר</span>
        </button>

        <button
          onClick={onDocuments}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="btn-documents"
          aria-label="הפק מסמכים"
        >
          <FolderOpen className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <span className="text-sm font-medium">הפק מסמכים</span>
        </button>

        <button
          onClick={onDelivery}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="btn-delivery"
          aria-label="שלח תוצרים ללקוח"
        >
          <Send className="w-4 h-4 text-green-600" aria-hidden="true" />
          <span className="text-sm font-medium">שלח תוצרים</span>
        </button>
      </div>
    </section>
  )
}
