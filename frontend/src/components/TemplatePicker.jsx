import React, { useState, useEffect, useMemo, useCallback } from "react"
import { X, FileText, FolderOpen, Search, Loader2, ExternalLink, Check, AlertCircle } from "lucide-react"
import { getStoredApiBase } from "../utils/apiBase"

/**
 * TemplatePicker - Modal for selecting and generating Word documents
 * V2: Fixed P0 issues from brutal review:
 * - Added prominent loading overlay during generation
 * - Extended success message duration (3s)
 * - Added persistent toast notification
 * - Formatted template names
 * - Added aria-labels for accessibility
 */

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 rounded-lg shadow-lg z-[60] animate-slide-up ${
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {type === "success" ? (
          <Check className="w-5 h-5 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0" />
        )}
        <div className="flex-1 font-medium">{message}</div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded"
          aria-label="סגור הודעה"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Format template name - remove prefixes, underscores, file extensions
function formatTemplateName(name) {
  if (!name) return ""
  return name
    .replace(/^טמפלייט[_\s]*/i, "") // Remove "טמפלייט_" prefix
    .replace(/\.docx?$/i, "") // Remove file extension
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
}

export default function TemplatePicker({ open, onClose, clientName, onGenerated }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [generating, setGenerating] = useState(null)
  const [status, setStatus] = useState({ type: "", message: "", url: "" })
  const [toast, setToast] = useState(null)
  const [progress, setProgress] = useState(0)

  const API = useMemo(() => {
    return (getStoredApiBase() || import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
  }, [])

  // Load templates on open
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setFilter("")
    setStatus({ type: "", message: "", url: "" })
    setProgress(0)

    fetch(`${API}/word/templates`)
      .then(r => r.ok ? r.json() : Promise.reject("Failed"))
      .then(data => {
        setTemplates(data.templates || [])
        setLoading(false)
      })
      .catch(() => {
        setTemplates([])
        setLoading(false)
        setStatus({ type: "error", message: "לא ניתן לטעון טמפלייטים" })
      })
  }, [open, API])

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!filter.trim()) return templates
    const q = filter.toLowerCase()
    return templates.filter(t =>
      (t.name || "").toLowerCase().includes(q) ||
      (t.category || "").toLowerCase().includes(q)
    )
  }, [templates, filter])

  // Simulate progress during generation
  useEffect(() => {
    if (!generating) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev // Stop at 90% until complete
        return prev + Math.random() * 15
      })
    }, 300)

    return () => clearInterval(interval)
  }, [generating])

  // Generate document from template
  async function handleGenerate(template) {
    const formattedName = formatTemplateName(template.name)
    setGenerating(template.path)
    setStatus({ type: "", message: "", url: "" })
    setProgress(5)

    try {
      const r = await fetch(`${API}/word/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          template_path: template.path
        })
      })

      if (r.ok) {
        const data = await r.json()
        setProgress(100)

        const successMsg = `המסמך "${formattedName}" נוצר בהצלחה`
        setStatus({
          type: "success",
          message: successMsg,
          url: data.webUrl || ""
        })

        // Notify parent
        onGenerated && onGenerated({
          type: "doc",
          label: formattedName,
          url: data.webUrl || "",
          path: data.path || ""
        })

        // Show persistent toast BEFORE closing modal
        setToast({ type: "success", message: successMsg })

        // Close after longer delay (3 seconds)
        setTimeout(() => {
          onClose()
        }, 3000)
      } else {
        throw new Error("Generation failed")
      }
    } catch (err) {
      setStatus({ type: "error", message: "יצירת המסמך נכשלה. נסה שוב." })
      setToast({ type: "error", message: "יצירת המסמך נכשלה" })
    } finally {
      setGenerating(null)
    }
  }

  // Open templates folder
  async function handleOpenFolder() {
    try {
      const r = await fetch(`${API}/word/templates_root`)
      if (r.ok) {
        const data = await r.json()
        if (data.url) {
          window.open(data.url, "_blank", "noopener,noreferrer")
          return
        }
      }
    } catch {}
    // Fallback
    window.open("https://eislaw.sharepoint.com/sites/EISLAWTEAM/", "_blank", "noopener,noreferrer")
  }

  // Handle close - clear toast after delay
  const handleClose = useCallback(() => {
    onClose()
    // Keep toast visible for a bit after modal closes
    setTimeout(() => setToast(null), 5000)
  }, [onClose])

  if (!open) return null

  return (
    <>
      {/* Toast notification - persists after modal close */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
      >
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative"
          onClick={e => e.stopPropagation()}
          data-testid="template-picker-modal"
        >
          {/* Loading overlay during generation */}
          {generating && (
            <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <div className="text-lg font-medium text-gray-700 mb-2">
                מייצר את המסמך...
              </div>
              <div className="text-sm text-gray-500 mb-4">
                נא להמתין, המסמך מועלה ל-SharePoint
              </div>
              {/* Progress bar */}
              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {Math.round(progress)}%
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 id="template-picker-title" className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" aria-hidden="true" />
              הפקת מסמך: {clientName}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="סגור חלון"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Search and Open Folder */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="חפש טמפלייט..."
                  className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="חפש טמפלייט"
                />
              </div>
              <button
                onClick={handleOpenFolder}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="פתח תיקיית טמפלייטים ב-SharePoint"
              >
                <FolderOpen className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">פתח תיקייה</span>
              </button>
            </div>

            {/* Status message with link */}
            {status.message && (
              <div
                className={`mb-4 p-4 rounded-lg text-sm ${
                  status.type === "error"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : status.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-gray-50 text-gray-600"
                }`}
                role={status.type === "error" ? "alert" : "status"}
              >
                <div className="flex items-center gap-2">
                  {status.type === "success" && <Check className="w-5 h-5" aria-hidden="true" />}
                  {status.type === "error" && <AlertCircle className="w-5 h-5" aria-hidden="true" />}
                  <span className="font-medium">{status.message}</span>
                </div>
                {status.type === "success" && status.url && (
                  <a
                    href={status.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-emerald-600 hover:text-emerald-800 underline"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    פתח ב-SharePoint
                  </a>
                )}
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin ml-2" aria-hidden="true" />
                <span>טוען טמפלייטים...</span>
              </div>
            )}

            {/* Templates list */}
            {!loading && (
              <div className="border rounded-lg overflow-hidden">
                <div
                  className="max-h-[400px] overflow-y-auto divide-y"
                  role="listbox"
                  aria-label="רשימת טמפלייטים"
                >
                  {filteredTemplates.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {templates.length === 0 ? "לא נמצאו טמפלייטים" : "אין תוצאות לחיפוש"}
                    </div>
                  ) : (
                    filteredTemplates.map((template, index) => {
                      const formattedName = formatTemplateName(template.name)
                      return (
                        <button
                          key={template.path}
                          onClick={() => handleGenerate(template)}
                          disabled={generating !== null}
                          className="w-full text-right px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                          role="option"
                          aria-selected={false}
                          aria-label={`יצירת מסמך: ${formattedName}`}
                        >
                          <FileText className="w-5 h-5 text-blue-500 shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 truncate">
                              {formattedName}
                            </div>
                            {template.category && template.category !== "SharePoint" && (
                              <div className="text-xs text-gray-400 truncate">
                                {template.category}
                              </div>
                            )}
                          </div>
                          {generating === template.path && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" aria-hidden="true" />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              {templates.length > 0 && `${filteredTemplates.length} מתוך ${templates.length} טמפלייטים`}
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      </div>

      {/* CSS for animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
