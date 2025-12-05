import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Sparkles, X, RefreshCw, Save, Wand2, Lightbulb, AlertTriangle, ChevronDown } from 'lucide-react'
import { getStoredApiBase } from '../utils/apiBase'

/**
 * PromptAIGenerator - Modal for generating prompts using AI
 * Injects existing prompts as context so AI can reference them
 */
export default function PromptAIGenerator({ isOpen, onClose, onGenerated, existingPrompts = [], defaultCategory = null }) {
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingStage, setGeneratingStage] = useState('') // 'preparing' | 'sending' | 'waiting' | 'processing'
  const [error, setError] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState(null)
  const [originalGenerated, setOriginalGenerated] = useState(null) // Track original for dirty check
  const [step, setStep] = useState('input') // 'input' | 'preview'
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  }, [])

  // Get prompt names for hints
  const promptHints = useMemo(() => {
    const hints = []
    for (const cat of existingPrompts) {
      for (const prompt of cat.prompts || []) {
        hints.push(prompt.name)
      }
    }
    return hints.slice(0, 5) // Show max 5 hints
  }, [existingPrompts])

  // Check if there are any existing prompts
  const hasExistingPrompts = useMemo(() => {
    return existingPrompts.some(cat => (cat.prompts || []).length > 0)
  }, [existingPrompts])

  // Check if user made edits to generated prompt
  const hasUnsavedEdits = useMemo(() => {
    if (!generatedPrompt || !originalGenerated) return false
    return JSON.stringify(generatedPrompt) !== JSON.stringify(originalGenerated)
  }, [generatedPrompt, originalGenerated])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription('')
      setError('')
      setGeneratedPrompt(null)
      setOriginalGenerated(null)
      setStep('input')
      setGeneratingStage('')
      setSelectedCategory(defaultCategory || existingPrompts[0]?.id || null)
    }
  }, [isOpen, defaultCategory, existingPrompts])

  // Safe close with confirmation
  function handleSafeClose() {
    if (step === 'preview' && hasUnsavedEdits) {
      if (!confirm('יש שינויים שלא נשמרו. לסגור בכל זאת?')) {
        return
      }
    }
    onClose()
  }

  async function handleGenerate() {
    if (!description.trim()) {
      setError('נא להזין תיאור של הפרומפט הרצוי')
      return
    }

    setGenerating(true)
    setError('')
    setGeneratingStage('preparing')

    try {
      // Stage 1: Preparing request
      await new Promise(r => setTimeout(r, 300)) // Brief pause for UX
      setGeneratingStage('sending')

      const res = await fetch(`${API}/api/templates/marketing-prompts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          target_category: selectedCategory
        })
      })

      // Stage 2: Waiting for AI response
      setGeneratingStage('waiting')

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        // Translate common errors to Hebrew
        let errorMsg = errorData.detail || `שגיאה ${res.status}`
        if (errorMsg.includes('rate limit') || res.status === 429) {
          errorMsg = 'יותר מדי בקשות. נא להמתין 30 שניות ולנסות שוב.'
        } else if (errorMsg.includes('timeout') || res.status === 504) {
          errorMsg = 'הבקשה לקחה יותר מדי זמן. נא לנסות שוב.'
        } else if (errorMsg.includes('GEMINI_API_KEY')) {
          errorMsg = 'שירות ה-AI לא מוגדר. נא לפנות למנהל המערכת.'
        }
        throw new Error(errorMsg)
      }

      // Stage 3: Processing response
      setGeneratingStage('processing')
      const data = await res.json()

      if (data.success && data.generated_prompt) {
        setGeneratedPrompt(data.generated_prompt)
        setOriginalGenerated(JSON.parse(JSON.stringify(data.generated_prompt))) // Deep copy
        setStep('preview')
      } else {
        throw new Error('תשובה לא תקינה מהשרת')
      }
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת הפרומפט')
    } finally {
      setGenerating(false)
      setGeneratingStage('')
    }
  }

  function handleRegenerate() {
    // Keep description, go back to input
    setStep('input')
    setGeneratedPrompt(null)
    setOriginalGenerated(null)
  }

  function handleSave() {
    if (generatedPrompt) {
      onGenerated(generatedPrompt, selectedCategory)
      onClose()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && e.ctrlKey && !generating && step === 'input') {
      handleGenerate()
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && step === 'preview') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleSafeClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleSafeClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-l from-petrol/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-petrol/10 rounded-lg">
              <Wand2 className="w-5 h-5 text-petrol" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">יצירת פרומפט עם AI</h3>
              <p className="text-sm text-slate-500">תאר מה אתה צריך והמערכת תיצור פרומפט מותאם</p>
            </div>
          </div>
          <button onClick={handleSafeClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-4">
              {/* Warning when no existing prompts */}
              {!hasExistingPrompts && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-700">
                      <p className="font-medium">אין פרומפטים קיימים במערכת</p>
                      <p className="text-amber-600 text-xs mt-1">
                        ה-AI ייצור פרומפט כללי. לתוצאות טובות יותר, צור קודם פרומפט ידני לשימוש כרפרנס.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hints about existing prompts */}
              {promptHints.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">ניתן להתייחס לפרומפטים קיימים:</p>
                      <p className="text-blue-600">{promptHints.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Category selection */}
              {existingPrompts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    קטגוריה יעד
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCategory || ''}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol appearance-none bg-white pr-10"
                    >
                      {existingPrompts.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} {cat.name_en ? `(${cat.name_en})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Description input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  תאר את הפרומפט שאתה צריך
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="לדוגמה: פרומפט לפוסטים בלינקדאין בסגנון של איתן, עם פתיחת סיפור ותובנה משפטית..."
                  rows={5}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol resize-none"
                  autoFocus
                />
                <p className="mt-1 text-xs text-slate-400">
                  Ctrl+Enter ליצירה מהירה
                </p>
              </div>

              {/* Example prompts */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">דוגמאות:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'פרומפט לפוסט לינקדאין קצר על נושא משפטי',
                    'פרומפט לחילוץ סיפורים מתמלילים',
                    'פרומפט בסגנון מקצועי אך נגיש',
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setDescription(example)}
                      className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && generatedPrompt && (
            <div className="space-y-4">
              {/* Unsaved changes indicator */}
              {hasUnsavedEdits && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  יש שינויים שלא נשמרו
                </div>
              )}

              {/* Generated prompt preview */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500">שם הפרומפט</label>
                    <input
                      type="text"
                      value={generatedPrompt.name}
                      onChange={e => setGeneratedPrompt({ ...generatedPrompt, name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">שם באנגלית</label>
                    <input
                      type="text"
                      value={generatedPrompt.name_en || ''}
                      onChange={e => setGeneratedPrompt({ ...generatedPrompt, name_en: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500">תיאור</label>
                  <input
                    type="text"
                    value={generatedPrompt.description || ''}
                    onChange={e => setGeneratedPrompt({ ...generatedPrompt, description: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500">תוכן הפרומפט</label>
                  <textarea
                    value={generatedPrompt.content}
                    onChange={e => setGeneratedPrompt({ ...generatedPrompt, content: e.target.value })}
                    rows={14}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                    dir="ltr"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Ctrl+S לשמירה מהירה
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleSafeClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            ביטול
          </button>

          <div className="flex gap-2">
            {step === 'input' && (
              <button
                onClick={handleGenerate}
                disabled={generating || !description.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[160px] justify-center"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      {generatingStage === 'preparing' && 'מכין בקשה...'}
                      {generatingStage === 'sending' && 'שולח ל-AI...'}
                      {generatingStage === 'waiting' && 'ממתין לתשובה...'}
                      {generatingStage === 'processing' && 'מעבד תשובה...'}
                      {!generatingStage && 'מייצר...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    צור פרומפט
                  </>
                )}
              </button>
            )}

            {step === 'preview' && (
              <>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  <RefreshCw className="w-4 h-4" />
                  ערוך תיאור
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90"
                >
                  <Save className="w-4 h-4" />
                  שמור פרומפט
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
