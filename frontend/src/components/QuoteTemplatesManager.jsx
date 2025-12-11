import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, FileText, Copy, Eye, Check } from 'lucide-react'
import { getStoredApiBase } from '../utils/apiBase'

/**
 * Generate a UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * QuoteTemplatesManager - UI for editing price quote templates
 * Fixed version with all issues resolved
 */
export default function QuoteTemplatesManager() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedCats, setExpandedCats] = useState({})
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [previewClientName, setPreviewClientName] = useState('לקוח לדוגמה')

  const originalDataRef = useRef(null)

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  }, [])

  // Set page title
  useEffect(() => {
    const originalTitle = document.title
    document.title = 'ניהול תבניות הצעות מחיר | EISLAW'
    return () => { document.title = originalTitle }
  }, [])

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Track changes
  useEffect(() => {
    if (originalDataRef.current !== null) {
      const hasChanges = JSON.stringify(categories) !== JSON.stringify(originalDataRef.current)
      setHasUnsavedChanges(hasChanges)
    }
  }, [categories])

  // Load templates
  useEffect(() => {
    loadTemplates()
  }, [API])

  async function loadTemplates() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/templates/quotes`)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`שגיאת שרת (${res.status}): ${errorText || 'לא ניתן לטעון תבניות'}`)
      }
      const data = await res.json()
      const cats = data.categories || []
      setCategories(cats)
      originalDataRef.current = JSON.parse(JSON.stringify(cats))
      setHasUnsavedChanges(false)
      const expanded = {}
      cats.forEach(c => { expanded[c.id] = true })
      setExpandedCats(expanded)
    } catch (err) {
      setError('שגיאה בטעינת התבניות: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Debounced save function
  const saveTemplates = useCallback(async () => {
    if (saving) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API}/api/templates/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories })
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`שגיאת שרת (${res.status}): ${errorText || 'השמירה נכשלה'}`)
      }
      setSuccess('התבניות נשמרו בהצלחה!')
      originalDataRef.current = JSON.parse(JSON.stringify(categories))
      setHasUnsavedChanges(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('שגיאה בשמירה: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [API, categories, saving])

  function toggleCategory(catId) {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }))
  }

  function addCategory() {
    if (!newCategoryName.trim()) return
    const id = generateUUID()
    if (categories.some(c => c.name.trim().toLowerCase() === newCategoryName.trim().toLowerCase())) {
      setError('קטגוריה עם שם זה כבר קיימת')
      return
    }
    setCategories([...categories, { id, name: newCategoryName.trim(), templates: [] }])
    setNewCategoryName('')
    setShowNewCategory(false)
    setExpandedCats(prev => ({ ...prev, [id]: true }))
  }

  function handleCategoryKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCategory()
    } else if (e.key === 'Escape') {
      setShowNewCategory(false)
      setNewCategoryName('')
    }
  }

  function startEditCategory(catId, catName) {
    setEditingCategoryId(catId)
    setEditingCategoryName(catName)
  }

  function saveEditCategory() {
    if (!editingCategoryName.trim()) {
      setError('שם הקטגוריה לא יכול להיות ריק')
      return
    }
    if (categories.some(c => c.id !== editingCategoryId && c.name.trim().toLowerCase() === editingCategoryName.trim().toLowerCase())) {
      setError('קטגוריה עם שם זה כבר קיימת')
      return
    }
    setCategories(categories.map(c =>
      c.id === editingCategoryId ? { ...c, name: editingCategoryName.trim() } : c
    ))
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  function handleEditCategoryKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEditCategory()
    } else if (e.key === 'Escape') {
      setEditingCategoryId(null)
      setEditingCategoryName('')
    }
  }

  function deleteCategory(catId) {
    const cat = categories.find(c => c.id === catId)
    const templateCount = cat?.templates?.length || 0
    const message = templateCount > 0
      ? `למחוק את הקטגוריה "${cat.name}" ואת ${templateCount} התבניות שבה?`
      : `למחוק את הקטגוריה "${cat?.name}"?`
    if (!confirm(message)) return
    setCategories(categories.filter(c => c.id !== catId))
  }

  function addTemplate(catId) {
    const newTpl = {
      id: generateUUID(),
      name: 'תבנית חדשה',
      price: '0 ₪',
      type: 'one_time',
      body_template: 'שלום {client_name},\n\nבהמשך לשיחתנו...\n\nבברכה'
    }
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, templates: [...c.templates, newTpl] }
      }
      return c
    }))
    setEditingTemplate({ catId, tplId: newTpl.id, ...newTpl })
  }

  function duplicateTemplate(catId, tpl) {
    const newTpl = {
      ...tpl,
      id: generateUUID(),
      name: tpl.name + ' (עותק)'
    }
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const idx = c.templates.findIndex(t => t.id === tpl.id)
        const newTemplates = [...c.templates]
        newTemplates.splice(idx + 1, 0, newTpl)
        return { ...c, templates: newTemplates }
      }
      return c
    }))
    setSuccess(`התבנית "${tpl.name}" שוכפלה בהצלחה`)
    setTimeout(() => setSuccess(''), 2000)
  }

  function deleteTemplate(catId, tplId) {
    const cat = categories.find(c => c.id === catId)
    const tpl = cat?.templates?.find(t => t.id === tplId)
    if (!confirm(`למחוק את התבנית "${tpl?.name}"?`)) return
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, templates: c.templates.filter(t => t.id !== tplId) }
      }
      return c
    }))
  }

  function startEditTemplate(catId, tpl) {
    setEditingTemplate({ catId, tplId: tpl.id, ...tpl })
  }

  function saveEditTemplate() {
    if (!editingTemplate) return
    if (!editingTemplate.name.trim()) {
      setError('שם התבנית לא יכול להיות ריק')
      return
    }
    const { catId, tplId, ...tplData } = editingTemplate
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          templates: c.templates.map(t => t.id === tplId ? { ...t, ...tplData, name: tplData.name.trim() } : t)
        }
      }
      return c
    }))
    setEditingTemplate(null)
  }

  function cancelEdit() {
    if (editingTemplate) {
      const cat = categories.find(c => c.id === editingTemplate.catId)
      const originalTpl = cat?.templates?.find(t => t.id === editingTemplate.tplId)
      if (originalTpl) {
        const hasChanges = originalTpl.name !== editingTemplate.name ||
                          originalTpl.price !== editingTemplate.price ||
                          originalTpl.type !== editingTemplate.type ||
                          originalTpl.body_template !== editingTemplate.body_template
        if (hasChanges && !confirm('יש שינויים שלא נשמרו. לבטל?')) {
          return
        }
      }
    }
    setEditingTemplate(null)
  }

  function openPreview(tpl) {
    setPreviewTemplate(tpl)
  }

  function closePreview() {
    setPreviewTemplate(null)
  }

  function renderPreviewBody() {
    if (!previewTemplate?.body_template) return ''
    return previewTemplate.body_template
      .replace(/{client_name}/g, previewClientName)
      .replace(/{price}/g, previewTemplate.price || '')
      .replace(/{template_name}/g, previewTemplate.name || '')
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500">
        <div className="animate-pulse">טוען תבניות...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-petrol" />
          <h1 className="text-xl font-bold text-slate-800">ניהול תבניות הצעות מחיר</h1>
          {hasUnsavedChanges && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              שינויים לא נשמרו
            </span>
          )}
        </div>
        <button
          onClick={saveTemplates}
          disabled={saving || !hasUnsavedChanges}
          className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 whitespace-nowrap"
        >
          <Save className="w-4 h-4" />
          {saving ? 'שומר...' : 'שמור שינויים'}
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

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-lg mb-2">אין עדיין קטגוריות</p>
          <p className="text-sm">התחל על ידי הוספת קטגוריה חדשה</p>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat.id} className="border border-slate-200 rounded-xl bg-white shadow-sm">
            {/* Category Header */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleCategory(cat.id)}
            >
              <div className="flex items-center gap-2 flex-1">
                {expandedCats[cat.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}

                {editingCategoryId === cat.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={e => setEditingCategoryName(e.target.value)}
                      onKeyDown={handleEditCategoryKeyDown}
                      className="px-2 py-1 border rounded text-sm font-semibold"
                      autoFocus
                    />
                    <button
                      onClick={saveEditCategory}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="שמור"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingCategoryId(null); setEditingCategoryName('') }}
                      className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                      title="ביטול"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                    <span className="text-sm text-slate-400">({cat.templates.length} תבניות)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {editingCategoryId !== cat.id && (
                  <button
                    onClick={() => startEditCategory(cat.id, cat.name)}
                    className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded"
                    title="שנה שם קטגוריה"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => addTemplate(cat.id)}
                  className="p-1.5 text-petrol hover:bg-petrol/10 rounded"
                  title="הוסף תבנית"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  title="מחק קטגוריה"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Templates List */}
            {expandedCats[cat.id] && (
              <div className="border-t divide-y">
                {cat.templates.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-400">
                    אין תבניות בקטגוריה זו. לחץ + להוספה.
                  </div>
                )}
                {cat.templates.map(tpl => (
                  <div key={tpl.id} className="px-4 py-3 hover:bg-slate-50">
                    {editingTemplate?.tplId === tpl.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-slate-600">שם התבנית</label>
                            <input
                              type="text"
                              value={editingTemplate.name}
                              onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                              placeholder="הזן שם לתבנית"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">מחיר</label>
                            <input
                              type="text"
                              value={editingTemplate.price}
                              onChange={e => setEditingTemplate({ ...editingTemplate, price: e.target.value })}
                              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                              placeholder="לדוגמה: 5,000 ₪"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">סוג</label>
                          <select
                            value={editingTemplate.type}
                            onChange={e => setEditingTemplate({ ...editingTemplate, type: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                          >
                            <option value="one_time">חד פעמי</option>
                            <option value="retainer">ריטיינר (חודשי)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">
                            תוכן ההצעה
                            <span className="text-slate-400 font-normal mr-2">
                              (השתמש ב-{'{client_name}'} לשם הלקוח)
                            </span>
                          </label>
                          <textarea
                            value={editingTemplate.body_template}
                            onChange={e => setEditingTemplate({ ...editingTemplate, body_template: e.target.value })}
                            rows={6}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                            placeholder={'שלום {client_name},\n\nבהמשך לשיחתנו...'}
                            dir="rtl"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditTemplate}
                            className="flex items-center gap-1 px-3 py-1.5 bg-petrol text-white rounded-lg text-sm hover:bg-petrol/90"
                          >
                            <Save className="w-3 h-3" />
                            שמור
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-slate-50"
                          >
                            <X className="w-3 h-3" />
                            ביטול
                          </button>
                          <button
                            onClick={() => openPreview(editingTemplate)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-petrol text-petrol rounded-lg text-sm hover:bg-petrol/5 mr-auto"
                          >
                            <Eye className="w-3 h-3" />
                            תצוגה מקדימה
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800">{tpl.name}</div>
                          <div className="text-sm text-slate-500">
                            {tpl.price} • {tpl.type === 'retainer' ? 'ריטיינר' : 'חד פעמי'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openPreview(tpl)}
                            className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded"
                            title="תצוגה מקדימה"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => duplicateTemplate(cat.id, tpl)}
                            className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded"
                            title="שכפל תבנית"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEditTemplate(cat.id, tpl)}
                            className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded"
                            title="ערוך"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(cat.id, tpl.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="מחק"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add Category */}
        {showNewCategory ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={handleCategoryKeyDown}
                placeholder="שם הקטגוריה החדשה"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                autoFocus
              />
              <button
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="px-3 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50"
              >
                הוסף
              </button>
              <button
                onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                className="px-3 py-2 border rounded-lg hover:bg-slate-100"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCategory(true)}
            className="w-full border border-dashed border-slate-300 rounded-xl p-4 text-slate-500 hover:border-petrol hover:text-petrol transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            הוסף קטגוריה חדשה
          </button>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closePreview}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">תצוגה מקדימה: {previewTemplate.name}</h3>
              <button onClick={closePreview} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">שם לקוח לדוגמה</label>
                <input
                  type="text"
                  value={previewClientName}
                  onChange={e => setPreviewClientName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  placeholder="הזן שם לקוח לתצוגה מקדימה"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">נושא</label>
                <div className="mt-1 px-3 py-2 bg-slate-50 rounded-lg text-slate-700">
                  הצעת מחיר - {previewClientName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">תוכן ההודעה</label>
                <div className="mt-1 px-4 py-3 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap min-h-[200px] max-h-[300px] overflow-y-auto">
                  {renderPreviewBody()}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t">
                <span>מחיר: {previewTemplate.price}</span>
                <span>סוג: {previewTemplate.type === 'retainer' ? 'ריטיינר' : 'חד פעמי'}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
