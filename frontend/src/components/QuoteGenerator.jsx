import React, { useState, useEffect } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import TemplatePreview from './TemplatePreview'
import { detectApiBase, getStoredApiBase } from '../utils/apiBase.js'

export default function QuoteGenerator({ client, onClose, onGenerate }) {
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [apiBase, setApiBase] = useState(() => getStoredApiBase())
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('')

  useEffect(() => {
    const init = async () => {
      const detected = await detectApiBase([ENV_API])
      if (detected) setApiBase(detected)
    }
    init()
  }, [ENV_API])

  useEffect(() => {
    if (apiBase) {
      fetchTemplates()
    }
  }, [apiBase])

  const fetchTemplates = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/api/templates/quotes`)
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()

      // Handle both array and categorized responses
      if (Array.isArray(data)) {
        setTemplates(data)
        setCategories([])
      } else if (data.categories) {
        setCategories(data.categories)
        // Flatten templates for selection
        const allTemplates = data.categories.flatMap(cat =>
          (cat.templates || []).map(t => ({ ...t, category: cat.name }))
        )
        setTemplates(allTemplates)
      } else {
        setTemplates([])
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('שגיאה בטעינת תבניות')
      // Use fallback demo templates if API fails
      setTemplates([
        {
          id: 'basic',
          name: 'מאגר בידי יחיד',
          price: '2,300 ₪',
          description: 'חבילה חד-פעמית לעסק קטן המנהל מאגר בידי יחיד',
          includes: ['מדיניות פרטיות מעודכנת', 'נוסח יידוע לפי סעיף 11', 'נוסח מייל עדכון'],
          category: 'פרטיות'
        },
        {
          id: 'medium',
          name: 'רמת אבטחה בינונית',
          price: '14,250 ₪',
          description: 'חבילה לעסק עם דרישות אבטחה בינוניות',
          includes: ['רישום מאגר', 'מדיניות פרטיות', 'הסכם עיבוד מידע', 'נהלי אבטחה'],
          category: 'פרטיות'
        },
        {
          id: 'retainer',
          name: 'רמת אבטחה בינונית + ריטיינר',
          price: '5,000 ₪/חודש',
          commitment: '12 חודשים',
          description: 'ליווי משפטי שוטף כולל ריטיינר חודשי',
          includes: ['כל השירותים ברמה בינונית', 'ליווי שוטף', 'עדכונים רגולטוריים', 'ייעוץ טלפוני'],
          category: 'פרטיות'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    if (!selectedTemplate) return

    const quoteData = {
      template: selectedTemplate,
      client,
      notes,
      discount: discount ? parseFloat(discount) : 0,
      generatedAt: new Date().toISOString()
    }

    if (onGenerate) {
      onGenerate(quoteData)
    }

    setShowPreview(true)
  }

  const clientName = client?.name || client?.display_name || 'לקוח'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-copper/10">
              <FileText className="w-5 h-5 text-copper" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">יצירת הצעת מחיר</h2>
              <p className="text-sm text-slate-500">{clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4" dir="rtl">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-petrol" />
              <span className="mr-2 text-slate-600">טוען תבניות...</span>
            </div>
          ) : error ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-4">
              {error} - משתמש בתבניות לדוגמה
            </div>
          ) : null}

          {/* Template Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">בחר תבנית</label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg p-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`w-full text-right p-3 rounded-lg border transition-all ${
                    selectedTemplate?.id === t.id
                      ? 'border-petrol bg-petrol/5 ring-1 ring-petrol'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">{t.name}</div>
                      {t.category && (
                        <span className="text-xs text-slate-500">{t.category}</span>
                      )}
                      {t.description && (
                        <div className="text-sm text-slate-600 mt-1 line-clamp-2">{t.description}</div>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <div className="font-bold text-copper">{t.price}</div>
                      {t.commitment && (
                        <div className="text-xs text-slate-500">{t.commitment}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {templates.length === 0 && !loading && (
                <div className="text-center py-4 text-slate-500">
                  אין תבניות זמינות
                </div>
              )}
            </div>
          </div>

          {/* Selected Template Preview */}
          {selectedTemplate && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{selectedTemplate.name}</p>
                  <p className="text-sm text-slate-600">{selectedTemplate.description}</p>
                </div>
                <p className="text-lg font-bold text-copper">{selectedTemplate.price}</p>
              </div>
              {selectedTemplate.includes?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 mb-1">כולל:</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {selectedTemplate.includes.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="text-success">✓</span> {item}
                      </li>
                    ))}
                    {selectedTemplate.includes.length > 3 && (
                      <li className="text-slate-400">
                        + עוד {selectedTemplate.includes.length - 3} פריטים...
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">הערות (אופציונלי)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות נוספות להצעה..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">הנחה (אופציונלי)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-slate-600">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 flex gap-2 justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={() => setShowPreview(true)}
            disabled={!selectedTemplate}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            תצוגה מקדימה
          </button>
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-petrol text-white text-sm hover:bg-petrol/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            צור הצעה
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          client={client}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
