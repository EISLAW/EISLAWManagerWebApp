import React, { useEffect, useState } from 'react'
import { FolderPlus, Link, X } from 'lucide-react'

export default function ActivateContactModal({ contact, onConfirm, onCancel, loading }) {
  const [createFolder, setCreateFolder] = useState(true)
  const [folderPath, setFolderPath] = useState('')

  useEffect(() => {
    setFolderPath(contact?.sharepoint_url || '')
    setCreateFolder(!contact?.sharepoint_url)
  }, [contact])

  if (!contact) return null

  const handleConfirm = () => {
    onConfirm({
      createFolder,
      folderPath: createFolder ? null : (folderPath || undefined)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 space-y-4" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-petrol">הפעלת איש קשר</h2>
            <p className="text-sm text-slate-600 mt-1">ניצור לקוח חדש עבור <strong>{contact.name || 'איש קשר'}</strong> במערכת.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">תיקיית SharePoint</label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="folderOption"
              checked={createFolder}
              onChange={() => setCreateFolder(true)}
              className="w-4 h-4 text-petrol"
            />
            <FolderPlus className="w-5 h-5 text-petrol" />
            <div>
              <div className="text-sm font-medium text-slate-800">צור תיקייה חדשה</div>
              <div className="text-xs text-slate-500">ייווצר תיקייה בשם "{contact.name}" בתיקיית לקוחות משרד</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="folderOption"
              checked={!createFolder}
              onChange={() => setCreateFolder(false)}
              className="w-4 h-4 text-petrol"
            />
            <Link className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-sm font-medium text-slate-800">קשר תיקייה קיימת</div>
              <div className="text-xs text-slate-500">הזן לינק לתיקיית SharePoint קיימת</div>
            </div>
          </label>

          {!createFolder && (
            <input
              type="text"
              dir="ltr"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="https://eislaw.sharepoint.com/..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 min-h-[44px] rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>יוצר לקוח...</span>
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" />
                <span>צור כלקוח</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
