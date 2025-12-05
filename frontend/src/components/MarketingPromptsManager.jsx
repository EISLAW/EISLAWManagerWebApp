import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, FileText, Copy, Eye, Check, Sparkles, Wand2 } from 'lucide-react'
import { getStoredApiBase } from '../utils/apiBase'
import PromptAIGenerator from './PromptAIGenerator'

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
 * MarketingPromptsManager - UI for editing AI prompt templates
 * Used for Marketing content generation and AI assistants
 */
export default function MarketingPromptsManager() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedCats, setExpandedCats] = useState({})
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [previewPrompt, setPreviewPrompt] = useState(null)
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [targetCategoryForAI, setTargetCategoryForAI] = useState(null)

  const originalDataRef = useRef(null)

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  }, [])

  // Set page title
  useEffect(() => {
    const originalTitle = document.title
    document.title = 'ניהול תבניות פרומפטים | EISLAW'
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

  // Load prompts
  useEffect(() => {
    loadPrompts()
  }, [API])

  async function loadPrompts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/templates/marketing-prompts`)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`שגיאת שרת (${res.status}): ${errorText || 'לא ניתן לטעון פרומפטים'}`)
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
      setError('שגיאה בטעינת הפרומפטים: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Save function
  const savePrompts = useCallback(async () => {
    if (saving) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API}/api/templates/marketing-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: "1.0.0", categories })
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`שגיאת שרת (${res.status}): ${errorText || 'השמירה נכשלה'}`)
      }
      setSuccess('הפרומפטים נשמרו בהצלחה!')
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
    setCategories([...categories, {
      id,
      name: newCategoryName.trim(),
      name_en: newCategoryName.trim(),
      description: '',
      prompts: []
    }])
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
    const promptCount = cat?.prompts?.length || 0
    const message = promptCount > 0
      ? `למחוק את הקטגוריה "${cat.name}" ואת ${promptCount} הפרומפטים שבה?`
      : `למחוק את הקטגוריה "${cat?.name}"?`
    if (!confirm(message)) return
    setCategories(categories.filter(c => c.id !== catId))
  }

  function addPrompt(catId) {
    const newPrompt = {
      id: generateUUID(),
      name: 'פרומפט חדש',
      name_en: 'New Prompt',
      description: '',
      is_system: false,
      variables: [],
      content: '# Prompt Template\n\nEnter your prompt content here...'
    }
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, prompts: [...c.prompts, newPrompt] }
      }
      return c
    }))
    setEditingPrompt({ catId, promptId: newPrompt.id, ...newPrompt })
  }

  function duplicatePrompt(catId, prompt) {
    const newPrompt = {
      ...prompt,
      id: generateUUID(),
      name: prompt.name + ' (עותק)',
      is_system: false
    }
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const idx = c.prompts.findIndex(p => p.id === prompt.id)
        const newPrompts = [...c.prompts]
        newPrompts.splice(idx + 1, 0, newPrompt)
        return { ...c, prompts: newPrompts }
      }
      return c
    }))
    setSuccess(`הפרומפט "${prompt.name}" שוכפל בהצלחה`)
    setTimeout(() => setSuccess(''), 2000)
  }

  function deletePrompt(catId, promptId) {
    const cat = categories.find(c => c.id === catId)
    const prompt = cat?.prompts?.find(p => p.id === promptId)
    if (prompt?.is_system) {
      setError('לא ניתן למחוק פרומפט מערכת. ניתן לשכפל ולערוך עותק.')
      return
    }
    if (!confirm(`למחוק את הפרומפט "${prompt?.name}"?`)) return
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, prompts: c.prompts.filter(p => p.id !== promptId) }
      }
      return c
    }))
  }

  function startEditPrompt(catId, prompt) {
    setEditingPrompt({ catId, promptId: prompt.id, ...prompt })
  }

  function saveEditPrompt() {
    if (!editingPrompt) return
    if (!editingPrompt.name.trim()) {
      setError('שם הפרומפט לא יכול להיות ריק')
      return
    }
    const { catId, promptId, ...promptData } = editingPrompt
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          prompts: c.prompts.map(p => p.id === promptId ? { ...p, ...promptData, name: promptData.name.trim() } : p)
        }
      }
      return c
    }))
    setEditingPrompt(null)
  }

  function cancelEdit() {
    if (editingPrompt) {
      const cat = categories.find(c => c.id === editingPrompt.catId)
      const originalPrompt = cat?.prompts?.find(p => p.id === editingPrompt.promptId)
      if (originalPrompt) {
        const hasChanges = originalPrompt.name !== editingPrompt.name ||
                          originalPrompt.content !== editingPrompt.content ||
                          originalPrompt.description !== editingPrompt.description
        if (hasChanges && !confirm('יש שינויים שלא נשמרו. לבטל?')) {
          return
        }
      }
    }
    setEditingPrompt(null)
  }

  function openPreview(prompt) {
    setPreviewPrompt(prompt)
  }

  function closePreview() {
    setPreviewPrompt(null)
  }

  function openAIGenerator(catId = null) {
    setTargetCategoryForAI(catId)
    setShowAIGenerator(true)
  }

  function handleAIGenerated(generatedPrompt, selectedCategory) {
    // Create a new prompt from the AI-generated content
    const newPrompt = {
      id: generateUUID(),
      name: generatedPrompt.name || 'פרומפט חדש',
      name_en: generatedPrompt.name_en || '',
      description: generatedPrompt.description || '',
      is_system: false,
      variables: [],
      content: generatedPrompt.content || ''
    }

    // Add to selected category, or target category, or first category
    const targetCatId = selectedCategory || targetCategoryForAI || categories[0]?.id
    if (!targetCatId) {
      setError('אין קטגוריה זמינה. צור קטגוריה קודם.')
      return
    }

    setCategories(categories.map(c => {
      if (c.id === targetCatId) {
        return { ...c, prompts: [...(c.prompts || []), newPrompt] }
      }
      return c
    }))

    // Expand the target category
    setExpandedCats(prev => ({ ...prev, [targetCatId]: true }))

    // Start editing the new prompt
    setEditingPrompt({ catId: targetCatId, promptId: newPrompt.id, ...newPrompt })

    setSuccess('פרומפט נוצר בהצלחה! ניתן לערוך ולשמור.')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500">
        <div className="animate-pulse">טוען פרומפטים...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-petrol" />
          <h1 className="text-xl font-bold text-slate-800">ניהול תבניות פרומפטים</h1>
          {hasUnsavedChanges && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              שינויים לא נשמרו
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAIGenerator()}
            className="flex items-center gap-2 px-4 py-2 border border-petrol text-petrol rounded-lg hover:bg-petrol/5 transition-all"
          >
            <Wand2 className="w-4 h-4" />
            צור עם AI
          </button>
          <button
            onClick={savePrompts}
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <p>כאן ניתן לערוך את הפרומפטים שמשמשים ליצירת תוכן שיווקי ואסיסטנט AI. השתמש במשתנים כמו <code className="bg-blue-100 px-1 rounded">{'{{SOURCE}}'}</code> להזרקת תוכן דינמי.</p>
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
                    <button onClick={saveEditCategory} className="p-1 text-green-600 hover:bg-green-50 rounded" title="שמור">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditingCategoryId(null); setEditingCategoryName('') }} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="ביטול">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                    {cat.name_en && <span className="text-xs text-slate-400">({cat.name_en})</span>}
                    <span className="text-sm text-slate-400">({cat.prompts?.length || 0} פרומפטים)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {editingCategoryId !== cat.id && (
                  <button onClick={() => startEditCategory(cat.id, cat.name)} className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded" title="שנה שם">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => addPrompt(cat.id)} className="p-1.5 text-petrol hover:bg-petrol/10 rounded" title="הוסף פרומפט">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="מחק קטגוריה">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Prompts List */}
            {expandedCats[cat.id] && (
              <div className="border-t divide-y">
                {cat.prompts?.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-400">
                    אין פרומפטים בקטגוריה זו. לחץ + להוספה.
                  </div>
                )}
                {cat.prompts?.map(prompt => (
                  <div key={prompt.id} className="px-4 py-3 hover:bg-slate-50">
                    {editingPrompt?.promptId === prompt.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-slate-600">שם הפרומפט</label>
                            <input
                              type="text"
                              value={editingPrompt.name}
                              onChange={e => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">שם באנגלית</label>
                            <input
                              type="text"
                              value={editingPrompt.name_en || ''}
                              onChange={e => setEditingPrompt({ ...editingPrompt, name_en: e.target.value })}
                              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">תיאור</label>
                          <input
                            type="text"
                            value={editingPrompt.description || ''}
                            onChange={e => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                            placeholder="תיאור קצר של הפרומפט"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">
                            תוכן הפרומפט
                            <span className="text-slate-400 font-normal mr-2">
                              (משתנים: {'{{SOURCE}}'}, {'{{HOOK}}'}, {'{{FORMAT}}'})
                            </span>
                          </label>
                          <textarea
                            value={editingPrompt.content || ''}
                            onChange={e => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                            rows={12}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                            dir="ltr"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEditPrompt} className="flex items-center gap-1 px-3 py-1.5 bg-petrol text-white rounded-lg text-sm hover:bg-petrol/90">
                            <Save className="w-3 h-3" />
                            שמור
                          </button>
                          <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-slate-50">
                            <X className="w-3 h-3" />
                            ביטול
                          </button>
                          <button onClick={() => openPreview(editingPrompt)} className="flex items-center gap-1 px-3 py-1.5 border border-petrol text-petrol rounded-lg text-sm hover:bg-petrol/5 mr-auto">
                            <Eye className="w-3 h-3" />
                            תצוגה מקדימה
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{prompt.name}</span>
                            {prompt.is_system && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">מערכת</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">{prompt.description || prompt.name_en}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openPreview(prompt)} className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded" title="תצוגה מקדימה">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => duplicatePrompt(cat.id, prompt)} className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded" title="שכפל">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => startEditPrompt(cat.id, prompt)} className="p-1.5 text-slate-400 hover:text-petrol hover:bg-petrol/10 rounded" title="ערוך">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!prompt.is_system && (
                            <button onClick={() => deletePrompt(cat.id, prompt.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="מחק">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
              <button onClick={addCategory} disabled={!newCategoryName.trim()} className="px-3 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50">
                הוסף
              </button>
              <button onClick={() => { setShowNewCategory(false); setNewCategoryName('') }} className="px-3 py-2 border rounded-lg hover:bg-slate-100">
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
      {previewPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closePreview}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{previewPrompt.name}</h3>
                {previewPrompt.description && (
                  <p className="text-sm text-slate-500">{previewPrompt.description}</p>
                )}
              </div>
              <button onClick={closePreview} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-slate-50 p-4 rounded-lg border text-slate-700" dir="ltr">
                {previewPrompt.content}
              </pre>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
              <button onClick={closePreview} className="px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90">
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      <PromptAIGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerated={handleAIGenerated}
        existingPrompts={categories}
        defaultCategory={targetCategoryForAI}
      />
    </div>
  )
}
