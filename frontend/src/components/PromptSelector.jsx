import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, Sparkles, Check } from 'lucide-react'
import { getStoredApiBase } from '../utils/apiBase'

/**
 * PromptSelector - Dropdown to select AI prompt templates
 * Used in Marketing and RAG AI Assistant tabs
 */
export default function PromptSelector({
  value,
  onChange,
  categoryFilter = null,  // e.g., 'style_guides', 'content_formats', 'hook_types'
  label = 'תבנית פרומפט',
  labelEn = 'Prompt Template',
  placeholder = 'בחר תבנית...',
  className = ''
}) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  }, [])

  useEffect(() => {
    loadPrompts()
  }, [API])

  async function loadPrompts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/templates/marketing-prompts`)
      if (!res.ok) throw new Error('Failed to load prompts')
      const data = await res.json()
      let cats = data.categories || []

      // Filter by category if specified
      if (categoryFilter) {
        cats = cats.filter(c => c.id === categoryFilter)
      }

      setCategories(cats)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Find currently selected prompt
  const selectedPrompt = useMemo(() => {
    if (!value) return null
    for (const cat of categories) {
      const found = cat.prompts?.find(p => p.id === value)
      if (found) return { ...found, categoryName: cat.name }
    }
    return null
  }, [value, categories])

  // Get all prompts flattened (for easier searching)
  const allPrompts = useMemo(() => {
    const prompts = []
    for (const cat of categories) {
      for (const prompt of cat.prompts || []) {
        prompts.push({ ...prompt, categoryId: cat.id, categoryName: cat.name })
      }
    }
    return prompts
  }, [categories])

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="text-sm text-slate-400 animate-pulse">טוען תבניות...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    )
  }

  if (allPrompts.length === 0) {
    return null // Don't render if no prompts available
  }

  return (
    <div className={`relative ${className}`} dir="rtl">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        <span className="text-xs text-slate-400 mr-2">({labelEn})</span>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:border-slate-400 focus:ring-2 focus:ring-petrol/20 focus:border-petrol transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-petrol" />
          {selectedPrompt ? (
            <span className="text-slate-800">{selectedPrompt.name}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {/* None option */}
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-right text-sm hover:bg-slate-50 flex items-center justify-between ${
                !value ? 'bg-petrol/5' : ''
              }`}
            >
              <span className="text-slate-500">ללא תבנית (ברירת מחדל)</span>
              {!value && <Check className="w-4 h-4 text-petrol" />}
            </button>

            {/* Categories and prompts */}
            {categories.map(cat => (
              <div key={cat.id}>
                {/* Category header (only if multiple categories) */}
                {categories.length > 1 && (
                  <div className="px-3 py-1.5 bg-slate-50 text-xs font-medium text-slate-500 border-t">
                    {cat.name}
                  </div>
                )}

                {cat.prompts?.map(prompt => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => {
                      onChange(prompt.id, prompt)
                      setIsOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-right text-sm hover:bg-slate-50 flex items-center justify-between ${
                      value === prompt.id ? 'bg-petrol/5' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-800">{prompt.name}</span>
                        {prompt.is_system && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">מערכת</span>
                        )}
                      </div>
                      {prompt.description && (
                        <div className="text-xs text-slate-400">{prompt.description}</div>
                      )}
                    </div>
                    {value === prompt.id && <Check className="w-4 h-4 text-petrol" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
