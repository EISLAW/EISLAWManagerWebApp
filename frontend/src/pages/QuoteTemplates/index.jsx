import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, FileText, Copy, Eye, Check, Search, Filter } from 'lucide-react'
import { getStoredApiBase } from '../../utils/apiBase'
import TemplateCard from '../../components/TemplateCard'
import TemplateEditor from '../../components/TemplateEditor'

/**
 * QuoteTemplatesPage - UI for managing quote templates
 * Route: /settings/quotes
 */
export default function QuoteTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [expandedCats, setExpandedCats] = useState({})

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  }, [])

  // Set page title
  useEffect(() => {
    const originalTitle = document.title
    document.title = 'תבניות הצעות מחיר | EISLAW'
    return () => { document.title = originalTitle }
  }, [])

  // Load templates
  useEffect(() => {
    loadTemplates()
    loadCategories()
  }, [API])

  async function loadTemplates() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/templates/quotes/`)
      if (!res.ok) {
        throw new Error(`שגיאת שרת (${res.status})`)
      }
      const data = await res.json()
      setTemplates(data)
      // Auto-expand all categories
      const cats = [...new Set(data.map(t => t.category))]
      const expanded = {}
      cats.forEach(c => { expanded[c] = true })
      setExpandedCats(expanded)
    } catch (err) {
      setError('שגיאה בטעינת התבניות: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch(`${API}/api/templates/quotes/categories/list`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, searchQuery, selectedCategory])

  // Group by category
  const groupedTemplates = useMemo(() => {
    const groups = {}
    filteredTemplates.forEach(t => {
      if (!groups[t.category]) {
        groups[t.category] = []
      }
      groups[t.category].push(t)
    })
    return groups
  }, [filteredTemplates])

  function toggleCategory(cat) {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  // CRUD Operations
  async function handleCreate(templateData) {
    try {
      const res = await fetch(`${API}/api/templates/quotes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      if (!res.ok) throw new Error('Failed to create template')
      const newTemplate = await res.json()
      setTemplates(prev => [...prev, newTemplate])
      setEditingTemplate(null)
      setSuccess('התבנית נוצרה בהצלחה!')
      setTimeout(() => setSuccess(''), 3000)
      // Update categories if new one
      if (!categories.includes(templateData.category)) {
        setCategories(prev => [...prev, templateData.category])
      }
    } catch (err) {
      setError('שגיאה ביצירת התבנית: ' + err.message)
    }
  }

  async function handleUpdate(templateId, templateData) {
    try {
      const res = await fetch(`${API}/api/templates/quotes/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      if (!res.ok) throw new Error('Failed to update template')
      const updated = await res.json()
      setTemplates(prev => prev.map(t => t.id === templateId ? updated : t))
      setEditingTemplate(null)
      setSuccess('התבנית עודכנה בהצלחה!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('שגיאה בעדכון התבנית: ' + err.message)
    }
  }

  async function handleDelete(templateId) {
    const template = templates.find(t => t.id === templateId)
    if (!confirm(`למחוק את התבנית "${template?.name}"?`)) return
    try {
      const res = await fetch(`${API}/api/templates/quotes/${templateId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete template')
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      setSuccess('התבנית נמחקה בהצלחה!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('שגיאה במחיקת התבנית: ' + err.message)
    }
  }

  function handleDuplicate(template) {
    const newTemplate = {
      ...template,
      id: undefined,
      name: template.name + ' (עותק)',
      version: 1
    }
    setEditingTemplate(newTemplate)
  }

  function handleSave(templateData) {
    if (editingTemplate?.id) {
      handleUpdate(editingTemplate.id, templateData)
    } else {
      handleCreate(templateData)
    }
  }

  const categoryLabels = {
    general: 'כללי',
    privacy: 'פרטיות',
    litigation: 'ליטיגציה',
    commercial: 'מסחרי'
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500">
        <div className="animate-pulse">טוען תבניות...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-copper" />
          <h1 className="text-xl font-bold text-slate-800">תבניות הצעות מחיר</h1>
        </div>
        <button
          onClick={() => setEditingTemplate({})}
          className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          תבנית חדשה
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש תבניות..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
        >
          <option value="all">כל הקטגוריות</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {categoryLabels[cat] || cat}
            </option>
          ))}
        </select>
      </div>

      {/* Templates by Category */}
      <div className="space-y-4">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category} className="border border-slate-200 rounded-xl bg-white shadow-sm">
            {/* Category Header */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center gap-2">
                {expandedCats[category] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="font-semibold text-slate-800">
                  {categoryLabels[category] || category}
                </span>
                <span className="text-sm text-slate-400">
                  ({categoryTemplates.length} תבניות)
                </span>
              </div>
            </div>

            {/* Templates Grid */}
            {expandedCats[category] && (
              <div className="border-t px-4 py-4">
                {categoryTemplates.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-4">
                    אין תבניות בקטגוריה זו
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onEdit={() => setEditingTemplate(template)}
                        onDelete={() => handleDelete(template.id)}
                        onDuplicate={() => handleDuplicate(template)}
                        onPreview={() => setPreviewTemplate(template)}
                        categoryLabel={categoryLabels[template.category] || template.category}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {Object.keys(groupedTemplates).length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg mb-2">אין תבניות להצגה</p>
            <p className="text-sm">לחץ על "תבנית חדשה" ליצירת תבנית ראשונה</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          categories={categories}
          categoryLabels={categoryLabels}
          onSave={handleSave}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreviewTemplate(null)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{previewTemplate.name}</h3>
                <span className="text-sm text-slate-500">
                  {categoryLabels[previewTemplate.category] || previewTemplate.category}
                </span>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="bg-slate-50 p-4 rounded-lg border whitespace-pre-wrap text-sm">
                {previewTemplate.content}
              </div>
              {previewTemplate.variables?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-600 mb-2">משתנים:</p>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map(v => (
                      <span key={v} className="text-xs bg-petrol/10 text-petrol px-2 py-1 rounded">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
              <button onClick={() => setPreviewTemplate(null)} className="px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90">
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
