import React from 'react'
import { Eye, Edit2, Copy, Trash2 } from 'lucide-react'

/**
 * TemplateCard - Display a single quote template in a card format
 */
export default function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  categoryLabel
}) {
  // Extract price from content if it contains ₪
  const priceMatch = template.content?.match(/(\d{1,3}(?:,\d{3})*)\s*₪/)
  const displayPrice = priceMatch ? priceMatch[0] : null

  // Truncate content for preview
  const contentPreview = template.content?.substring(0, 100) + (template.content?.length > 100 ? '...' : '')

  // Count variables
  const variableCount = template.variables?.length || 0

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow overflow-hidden group">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-slate-800 text-base line-clamp-1">
            {template.name}
          </h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded whitespace-nowrap mr-2">
            {categoryLabel}
          </span>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-slate-500 line-clamp-2 mb-3 min-h-[2.5rem]">
          {contentPreview}
        </p>

        {/* Variables */}
        {variableCount > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.variables.slice(0, 3).map(v => (
              <span
                key={v}
                className="text-xs bg-petrol/10 text-petrol px-1.5 py-0.5 rounded"
              >
                {v}
              </span>
            ))}
            {variableCount > 3 && (
              <span className="text-xs text-slate-400">
                +{variableCount - 3}
              </span>
            )}
          </div>
        )}

        {/* Version Badge */}
        {template.version > 1 && (
          <div className="text-xs text-slate-400 mb-2">
            גרסה {template.version}
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="px-4 py-3 bg-slate-50 border-t flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-petrol hover:bg-petrol/10 rounded transition-colors"
          title="תצוגה מקדימה"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">תצוגה</span>
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-petrol hover:bg-petrol/10 rounded transition-colors"
          title="עריכה"
        >
          <Edit2 className="w-4 h-4" />
          <span className="hidden sm:inline">עריכה</span>
        </button>
        <button
          onClick={onDuplicate}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-petrol hover:bg-petrol/10 rounded transition-colors"
          title="שכפול"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-red-500 hover:bg-red-50 rounded transition-colors mr-auto"
          title="מחיקה"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
