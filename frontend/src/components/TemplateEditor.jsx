import React, { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2, Eye } from 'lucide-react'

/**
 * TemplateEditor - Modal for creating/editing quote templates
 */
export default function TemplateEditor({
  template,
  categories,
  categoryLabels,
  onSave,
  onClose
}) {
  const isNew = !template?.id
  const [form, setForm] = useState({
    name: template?.name || '',
    category: template?.category || 'general',
    content: template?.content || '',
    variables: template?.variables || []
  })
  const [newVariable, setNewVariable] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Detect variables from content
  useEffect(() => {
    const matches = form.content.match(/\{\{(\w+)\}\}/g) || []
    const detectedVars = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
    // Merge with existing variables
    const mergedVars = [...new Set([...form.variables, ...detectedVars])]
    if (JSON.stringify(mergedVars) !== JSON.stringify(form.variables)) {
      setForm(prev => ({ ...prev, variables: mergedVars }))
    }
  }, [form.content])

  function validate() {
    const newErrors = {}
    if (!form.name.trim()) {
      newErrors.name = 'שם התבנית נדרש'
    }
    if (!form.content.trim()) {
      newErrors.content = 'תוכן התבנית נדרש'
    }
    if (!form.category) {
      newErrors.category = 'קטגוריה נדרשת'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        category: form.category,
        content: form.content,
        variables: form.variables
      })
    } finally {
      setSaving(false)
    }
  }

  function addVariable() {
    if (!newVariable.trim()) return
    const varName = newVariable.trim().replace(/\s+/g, '_')
    if (!form.variables.includes(varName)) {
      setForm(prev => ({
        ...prev,
        variables: [...prev.variables, varName]
      }))
    }
    setNewVariable('')
  }

  function removeVariable(varToRemove) {
    setForm(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== varToRemove)
    }))
  }

  function insertVariable(varName) {
    const textarea = document.getElementById('template-content')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = form.content
      const newContent = text.substring(0, start) + `{{${varName}}}` + text.substring(end)
      setForm(prev => ({ ...prev, content: newContent }))
      // Reset cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4)
      }, 0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">
            {isNew ? 'תבנית חדשה' : 'עריכת תבנית'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                שם התבנית *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol ${
                  errors.name ? 'border-red-500' : 'border-slate-200'
                }`}
                placeholder="לדוגמה: הצעת מחיר - ייעוץ פרטיות"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                קטגוריה *
              </label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-petrol/20 focus:border-petrol ${
                  errors.category ? 'border-red-500' : 'border-slate-200'
                }`}
              >
                <option value="general">{categoryLabels?.general || 'כללי'}</option>
                <option value="privacy">{categoryLabels?.privacy || 'פרטיות'}</option>
                <option value="litigation">{categoryLabels?.litigation || 'ליטיגציה'}</option>
                <option value="commercial">{categoryLabels?.commercial || 'מסחרי'}</option>
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category}</p>
              )}
            </div>

            {/* Variables */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                משתנים
                <span className="text-slate-400 font-normal mr-2">
                  (לחץ להכנסה בטקסט)
                </span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.variables.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="flex items-center gap-1 text-sm bg-petrol/10 text-petrol px-2 py-1 rounded hover:bg-petrol/20 transition-colors group"
                  >
                    <span>{`{{${v}}}`}</span>
                    <X
                      className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); removeVariable(v); }}
                    />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVariable}
                  onChange={e => setNewVariable(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                  placeholder="הוסף משתנה חדש..."
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                />
                <button
                  type="button"
                  onClick={addVariable}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                משתנים נפוצים: client_name, price, date, service_description
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                תוכן התבנית *
              </label>
              <textarea
                id="template-content"
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-petrol/20 focus:border-petrol ${
                  errors.content ? 'border-red-500' : 'border-slate-200'
                }`}
                placeholder={`לכבוד {{client_name}},

בהמשך לפגישתנו, להלן הצעת המחיר שלנו:

שירות: {{service_description}}
מחיר: {{price}} ₪

תוקף ההצעה: 30 יום

בברכה,
משרד עורכי דין איזלאו`}
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'שומר...' : isNew ? 'צור תבנית' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
