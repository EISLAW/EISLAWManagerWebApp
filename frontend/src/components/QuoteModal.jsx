import React, { useState, useEffect } from "react"
import { X, FileText, ExternalLink, Eye, Mail } from "lucide-react"

/**
 * QuoteModal - Modal for generating and sending price quotes
 */
export default function QuoteModal({ open, onClose, clientName, clientEmail, apiBase }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [preview, setPreview] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Load templates on open
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError("")
    fetch(`${apiBase}/api/templates/quotes`)
      .then(r => r.ok ? r.json() : Promise.reject("Failed to load templates"))
      .then(data => {
        setCategories(data.categories || [])
        setLoading(false)
      })
      .catch(err => {
        setError(String(err))
        setLoading(false)
        // Fallback to hardcoded templates if API not ready
        setCategories([
          {
            id: "privacy",
            name: "פרטיות",
            templates: [
              { id: "basic", name: "מאגר בידי יחיד", price: "2,300 ₪", type: "one_time" },
              { id: "basic_full", name: "רמת בסיסית", price: "3,000 ₪", type: "one_time" },
              { id: "medium_onetime", name: "רמת בינונית - חד פעמי", price: "14,250 ₪", type: "one_time" },
              { id: "medium_retainer", name: "רמת בינונית - ריטיינר", price: "5,000 ₪/חודש", type: "retainer" },
              { id: "high_dpo", name: "רמת גבוהה + DPO", price: "6,250 ₪/חודש", type: "retainer" },
            ],
          },
          {
            id: "commercial",
            name: "מסחרי",
            templates: [
              { id: "client_agreement", name: "הסכם לקוחות", price: "3,500 ₪", type: "one_time" },
              { id: "freelance", name: "הסכם פרילנס", price: "2,000 ₪", type: "one_time" },
              { id: "commercial_retainer", name: "ריטיינר מסחרי", price: "4,000 ₪/חודש", type: "retainer" },
            ],
          },
        ])
      })
  }, [open, apiBase])

  // Generate preview
  const handlePreview = async () => {
    if (!selectedTemplate) return
    setShowPreview(true)
    try {
      const r = await fetch(`${apiBase}/api/templates/quotes/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          client_name: clientName,
          client_email: clientEmail,
        }),
      })
      if (r.ok) {
        const data = await r.json()
        setPreview(data)
      } else {
        // Fallback preview
        setPreview({
          subject: `הצעת מחיר - ${clientName}`,
          body: `הי ${clientName},\n\nבהמשך לשיחתנו הנעימה...\n\nהעלות: ${selectedTemplate.price}\n\nאיתן`,
        })
      }
    } catch {
      // Fallback preview
      setPreview({
        subject: `הצעת מחיר - ${clientName}`,
        body: `הי ${clientName},\n\nבהמשך לשיחתנו הנעימה...\n\nהעלות: ${selectedTemplate.price}\n\nאיתן`,
      })
    }
  }

  // Open in Outlook (mailto)
  const handleOpenOutlook = () => {
    if (!selectedTemplate) return
    const subject = encodeURIComponent(preview?.subject || `הצעת מחיר - ${clientName}`)
    const body = encodeURIComponent(preview?.body || `הי ${clientName},\n\nבהמשך לשיחתנו...`)
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, "_blank")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="quote-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            הפקת הצעת מחיר: {clientName}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading && <div className="text-center py-8">טוען טמפלייטים...</div>}

          {!loading && !showPreview && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">בחר סוג הצעה:</p>

              {categories.map(cat => (
                <div key={cat.id} className="border rounded-lg p-3">
                  <h3 className="font-medium text-gray-700 mb-2">{cat.name}</h3>
                  <div className="space-y-2">
                    {cat.templates.map(tpl => (
                      <label
                        key={tpl.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          selectedTemplate?.id === tpl.id ? "bg-blue-50 border border-blue-200" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="quote-template"
                          checked={selectedTemplate?.id === tpl.id}
                          onChange={() => setSelectedTemplate(tpl)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">{tpl.name}</span>
                        <span className="text-sm text-gray-500">{tpl.price}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showPreview && preview && (
            <div className="space-y-4">
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                ← חזרה לבחירת טמפלייט
              </button>

              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="mb-2">
                  <span className="text-sm text-gray-500">נושא:</span>
                  <p className="font-medium">{preview.subject}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">תוכן:</span>
                  <pre className="mt-1 whitespace-pre-wrap text-sm font-sans">{preview.body}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            ביטול
          </button>

          {!showPreview ? (
            <button
              onClick={handlePreview}
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              data-testid="btn-preview-quote"
            >
              <Eye className="w-4 h-4" />
              תצוגה מקדימה
            </button>
          ) : (
            <button
              onClick={handleOpenOutlook}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              data-testid="btn-open-outlook-quote"
            >
              <Mail className="w-4 h-4" />
              פתח ב-Outlook
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
