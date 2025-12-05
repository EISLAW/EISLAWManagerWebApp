import React, { useState, useEffect } from "react"
import { X, Send, Eye, Mail, FileText, Check, Paperclip } from "lucide-react"

/**
 * DeliveryEmailModal - Modal for sending deliverables to client
 */
export default function DeliveryEmailModal({ open, onClose, clientName, clientEmail, apiBase, sharepointUrl }) {
  const [templates, setTemplates] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedDocs, setSelectedDocs] = useState([])
  const [preview, setPreview] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Load templates and documents on open
  useEffect(() => {
    if (!open) return
    setLoading(true)

    // Load delivery templates
    fetch(`${apiBase}/api/templates/delivery`)
      .then(r => r.ok ? r.json() : Promise.reject("Failed"))
      .then(data => setTemplates(data.templates || []))
      .catch(() => {
        // Fallback templates
        setTemplates([
          { id: "full_package", name: "משלוח מסמכים - חבילה מלאה" },
          { id: "partial", name: "משלוח מסמכים - המשך/חלקי" },
          { id: "single", name: "משלוח מסמך בודד" },
          { id: "custom", name: "נוסח חופשי" },
        ])
      })

    // Load client documents from SharePoint
    if (sharepointUrl) {
      fetch(`${apiBase}/api/sharepoint/files?url=${encodeURIComponent(sharepointUrl)}`)
        .then(r => r.ok ? r.json() : Promise.reject("Failed"))
        .then(data => {
          const docs = (data.files || []).filter(f =>
            f.name.endsWith(".docx") || f.name.endsWith(".pdf")
          )
          setDocuments(docs)
          // Auto-select all by default
          setSelectedDocs(docs.map(d => d.name))
        })
        .catch(() => setDocuments([]))
    }

    setLoading(false)
  }, [open, apiBase, sharepointUrl])

  const toggleDoc = (docName) => {
    setSelectedDocs(prev =>
      prev.includes(docName)
        ? prev.filter(d => d !== docName)
        : [...prev, docName]
    )
  }

  // Generate preview
  const handlePreview = async () => {
    if (!selectedTemplate) return
    setShowPreview(true)

    try {
      const r = await fetch(`${apiBase}/api/templates/delivery/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          client_name: clientName,
          documents: selectedDocs,
        }),
      })
      if (r.ok) {
        const data = await r.json()
        setPreview(data)
      } else {
        throw new Error("API not ready")
      }
    } catch {
      // Fallback preview based on template
      const docList = selectedDocs.map(d => `- ${d}`).join("\n")
      const count = selectedDocs.length

      let body = ""
      if (selectedTemplate.id === "full_package") {
        body = `הי ${clientName},

ראי ${count} מסמכים שהכנתי בעבורך, והם גם החשובים ביותר בשלב זה.
נתחיל בהם ונתקדם.

מה מצורף לכאן:
${docList}

יש פה הרבה מסמכים, וזה הרבה שיעורי בית, אז קחי את הזמן.
אני כתמיד פה לכל עניין, ואל תהססי לשאול אותי שאלות!

איתן`
      } else if (selectedTemplate.id === "partial") {
        body = `הי ${clientName},

נתתי לך כמה ימים לעכל – אז הגיעה העת להפיל עלייך עוד כמה מסמכים :)

מצורפים:
${docList}

איתן`
      } else {
        body = `הי ${clientName},

מצורף:
${docList}

איתן`
      }

      setPreview({
        subject: `מסמכים - ${clientName}`,
        body,
      })
    }
  }

  // Open in Outlook
  const handleOpenOutlook = () => {
    if (!preview) return
    const subject = encodeURIComponent(preview.subject)
    const body = encodeURIComponent(preview.body + "\n\n[יש לצרף את המסמכים המצויינים מ-SharePoint]")
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, "_blank")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="delivery-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-5 h-5" />
            שליחת תוצרים: {clientName}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading && <div className="text-center py-8">טוען...</div>}

          {!loading && !showPreview && (
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <p className="text-sm text-gray-600 mb-2">בחר טמפלייט מייל:</p>
                <div className="space-y-2">
                  {templates.map(tpl => (
                    <label
                      key={tpl.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedTemplate?.id === tpl.id ? "bg-blue-50 border border-blue-200" : "border border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery-template"
                        checked={selectedTemplate?.id === tpl.id}
                        onChange={() => setSelectedTemplate(tpl)}
                        className="w-4 h-4"
                      />
                      <span>{tpl.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Document Selection */}
              <div>
                <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  צרף מסמכים:
                </p>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">לא נמצאו מסמכים ב-SharePoint</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                    {documents.map(doc => (
                      <label
                        key={doc.name}
                        className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.name)}
                          onChange={() => toggleDoc(doc.name)}
                          className="w-4 h-4"
                        />
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{doc.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {showPreview && preview && (
            <div className="space-y-4">
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                ← חזרה לבחירה
              </button>

              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="mb-2">
                  <span className="text-sm text-gray-500">נושא:</span>
                  <p className="font-medium">{preview.subject}</p>
                </div>
                <div className="mb-4">
                  <span className="text-sm text-gray-500">תוכן:</span>
                  <pre className="mt-1 whitespace-pre-wrap text-sm font-sans">{preview.body}</pre>
                </div>
                <div>
                  <span className="text-sm text-gray-500">קבצים מצורפים ({selectedDocs.length}):</span>
                  <ul className="mt-1 text-sm">
                    {selectedDocs.map(doc => (
                      <li key={doc} className="flex items-center gap-1 text-blue-600">
                        <FileText className="w-3 h-3" />
                        {doc}
                      </li>
                    ))}
                  </ul>
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
              data-testid="btn-preview-delivery"
            >
              <Eye className="w-4 h-4" />
              תצוגה מקדימה
            </button>
          ) : (
            <button
              onClick={handleOpenOutlook}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              data-testid="btn-open-outlook-delivery"
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
