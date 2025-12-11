import React, { useState, useEffect } from 'react'
import { X, Printer, Copy, Send } from 'lucide-react'

export default function TemplatePreview({ template, client, onClose }) {
  const [rendered, setRendered] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (template) {
      renderTemplate()
    }
  }, [template, client])

  const renderTemplate = () => {
    let content = template.content || template.description || ''

    const variables = {
      '{{client_name}}': client?.name || client?.display_name || '[שם הלקוח]',
      '{{business_name}}': client?.business_name || client?.name || '[שם העסק]',
      '{{date}}': new Date().toLocaleDateString('he-IL'),
      '{{date_hebrew}}': new Date().toLocaleDateString('he-IL', { dateStyle: 'long' }),
      '{{lawyer_name}}': 'עו"ד איתן שמיר',
      '{{price}}': template.price || '',
      '{{includes_list}}': (template.includes || []).map(i => `• ${i}`).join('\n'),
    }

    Object.entries(variables).forEach(([key, value]) => {
      content = content.replaceAll(key, value)
    })

    setRendered(content)
  }

  const handleCopy = async () => {
    const text = buildQuoteText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const buildQuoteText = () => {
    const clientName = client?.name || client?.display_name || '[שם הלקוח]'
    const businessName = client?.business_name || ''
    const date = new Date().toLocaleDateString('he-IL')
    const includes = (template.includes || []).map(i => `✓ ${i}`).join('\n')

    return `
הצעת מחיר
${date}

לכבוד: ${clientName}
${businessName ? businessName + '\n' : ''}
שירות: ${template.name}
${template.description ? template.description + '\n' : ''}
═══════════════════════════════════════════════
מחיר: ${template.price}
═══════════════════════════════════════════════

${includes ? 'השירות כולל:\n' + includes + '\n' : ''}
${template.commitment ? `התחייבות: ${template.commitment}\n` : ''}
בברכה,
עו"ד איתן שמיר
משרד עורכי דין EISLAW
`.trim()
  }

  const handlePrint = () => {
    window.print()
  }

  if (!template) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">תצוגה מקדימה</h2>
            <p className="text-sm text-slate-500">{template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6" dir="rtl">
          {/* Quote Header */}
          <div className="text-center mb-6 pb-4 border-b border-slate-200">
            <h3 className="text-2xl font-bold text-petrol">הצעת מחיר</h3>
            <p className="text-slate-600 mt-1">{new Date().toLocaleDateString('he-IL')}</p>
          </div>

          {/* Client Info */}
          <div className="mb-6">
            <p className="text-slate-700">
              <span className="font-semibold">לכבוד:</span>{' '}
              {client?.name || client?.display_name || '[שם הלקוח]'}
            </p>
            {(client?.business_name || client?.name) && (
              <p className="text-slate-600">{client?.business_name || ''}</p>
            )}
          </div>

          {/* Service Info */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-800 mb-2">שירות: {template.name}</h4>
            {template.description && (
              <p className="text-slate-600">{template.description}</p>
            )}
          </div>

          {/* Price */}
          <div className="text-center py-4 my-6 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-3xl font-bold text-copper">
              {template.price}
            </p>
            {template.commitment && (
              <p className="text-sm text-slate-600 mt-2">{template.commitment}</p>
            )}
          </div>

          {/* Includes Section */}
          {template.includes?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3">השירות כולל:</h4>
              <ul className="space-y-2">
                {template.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="text-success mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Template Content (if has custom content) */}
          {rendered && template.content && (
            <div className="mb-6 prose prose-slate max-w-none whitespace-pre-wrap">
              {rendered}
            </div>
          )}

          {/* Signature */}
          <div className="mt-8 pt-4 border-t border-slate-200">
            <p className="text-slate-600">בברכה,</p>
            <p className="font-semibold text-slate-800">עו"ד איתן שמיר</p>
            <p className="text-slate-600">משרד עורכי דין EISLAW</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 flex gap-2 justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            סגור
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            הדפסה
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'הועתק!' : 'העתק ללוח'}
          </button>
          <button
            className="px-4 py-2 min-h-[44px] rounded-lg bg-petrol text-white text-sm hover:bg-petrol/90 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            שלח ללקוח
          </button>
        </div>
      </div>
    </div>
  )
}
