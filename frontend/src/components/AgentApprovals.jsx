import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle, X, Loader2, RefreshCcw } from 'lucide-react'
import { detectApiBase, getStoredApiBase } from '../utils/apiBase.js'

// ─────────────────────────────────────────────────────────────
// Mock Data for Development
// ─────────────────────────────────────────────────────────────

const MOCK_APPROVALS = [
  {
    id: '1',
    agent_name: 'Privacy Agent',
    action_name: 'שלח אימייל ללקוח',
    description: 'שליחת דו"ח הערכת פרטיות לאבי כהן',
    risk_level: 'high',
    context: 'לקוח: אבי כהן, ציון פרטיות: 72',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    agent_name: 'Task Agent',
    action_name: 'יצירת משימה',
    description: 'משימה חדשה: בדיקת חוזה לחברת ישראלי',
    risk_level: 'medium',
    context: 'לקוח: חברת ישראלי, תאריך יעד: 15/12/2025',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    agent_name: 'Document Agent',
    action_name: 'יצירת מסמך',
    description: 'יצירת הסכם שכירות עבור לקוח חדש',
    risk_level: 'low',
    context: 'סוג: הסכם שכירות, לקוח: דוד לוי',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
]

// ─────────────────────────────────────────────────────────────
// Reject Modal Component
// ─────────────────────────────────────────────────────────────

function RejectModal({ approval, onSubmit, onClose }) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">דחיית פעולה</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4" dir="rtl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">{approval.action_name}</p>
            <p className="text-xs text-red-600 mt-1">{approval.description}</p>
          </div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            סיבת הדחייה
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="הסבר למה הפעולה נדחית..."
            className="w-full border border-slate-200 rounded-lg p-3 min-h-[100px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30"
            dir="rtl"
          />
        </div>
        <div className="p-4 border-t border-slate-200 flex gap-2 justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={() => onSubmit(reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            דחה פעולה
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Approval Card Component
// ─────────────────────────────────────────────────────────────

function ApprovalCard({ approval, onApprove, onReject }) {
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  const getRiskConfig = (level) => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          label: 'גבוה',
          icon: AlertTriangle
        }
      case 'medium':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-800',
          border: 'border-amber-200',
          label: 'בינוני',
          icon: Clock
        }
      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-800',
          border: 'border-slate-200',
          label: 'נמוך',
          icon: Clock
        }
    }
  }

  const risk = getRiskConfig(approval.risk_level)
  const RiskIcon = risk.icon

  const handleApprove = async () => {
    setProcessing(true)
    await onApprove(approval.id)
    setProcessing(false)
  }

  const handleReject = async (reason) => {
    setProcessing(true)
    await onReject(approval.id, reason)
    setShowRejectModal(false)
    setProcessing(false)
  }

  const timeAgo = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'עכשיו'
    if (diffMins < 60) return `לפני ${diffMins} דקות`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `לפני ${diffHours} שעות`
    return date.toLocaleDateString('he-IL')
  }

  return (
    <>
      <div className={`border rounded-xl p-4 bg-white shadow-sm ${risk.border}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{approval.action_name}</h3>
            <p className="text-xs text-slate-500">{approval.agent_name}</p>
          </div>
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${risk.bg} ${risk.text}`}>
            <RiskIcon className="w-3 h-3" />
            {risk.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-700 mb-3">{approval.description}</p>

        {/* Context */}
        {approval.context && (
          <div className="bg-slate-50 rounded-lg p-2 mb-3 text-xs text-slate-600">
            <span className="font-medium">הקשר:</span> {approval.context}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-slate-400 mb-3">
          {timeAgo(approval.created_at)}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={processing}
            className="flex-1 bg-success text-white px-3 py-2 min-h-[44px] rounded-lg hover:bg-success/90 flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            אשר
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={processing}
            className="flex-1 bg-danger text-white px-3 py-2 min-h-[44px] rounded-lg hover:bg-danger/90 flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            דחה
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          approval={approval}
          onSubmit={handleReject}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Agent Approvals Component
// ─────────────────────────────────────────────────────────────

export default function AgentApprovals({ onCountChange }) {
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [apiBase, setApiBase] = useState(() => getStoredApiBase())
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [useMock, setUseMock] = useState(false)

  useEffect(() => {
    const init = async () => {
      const detected = await detectApiBase([ENV_API])
      if (detected) setApiBase(detected)
    }
    init()
  }, [ENV_API])

  useEffect(() => {
    if (apiBase) {
      fetchPendingApprovals()
      // Poll every 30 seconds
      const interval = setInterval(fetchPendingApprovals, 30000)
      return () => clearInterval(interval)
    }
  }, [apiBase])

  useEffect(() => {
    if (onCountChange) {
      onCountChange(approvals.length)
    }
  }, [approvals.length, onCountChange])

  const fetchPendingApprovals = async () => {
    try {
      const res = await fetch(`${apiBase}/api/approvals`)
      if (res.ok) {
        const data = await res.json()
        setApprovals(Array.isArray(data) ? data : data.approvals || [])
        setUseMock(false)
        setError('')
      } else {
        throw new Error('API not available')
      }
    } catch (err) {
      console.warn('Using mock approvals data:', err.message)
      setApprovals(MOCK_APPROVALS)
      setUseMock(true)
      setError('')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    if (useMock) {
      // Simulate approval with mock data
      await new Promise(resolve => setTimeout(resolve, 500))
      setApprovals(prev => prev.filter(a => a.id !== id))
      return
    }

    try {
      const res = await fetch(`${apiBase}/api/approvals/${id}/approve`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchPendingApprovals()
      }
    } catch (err) {
      console.error('Failed to approve:', err)
    }
  }

  const handleReject = async (id, reason) => {
    if (useMock) {
      // Simulate rejection with mock data
      await new Promise(resolve => setTimeout(resolve, 500))
      setApprovals(prev => prev.filter(a => a.id !== id))
      return
    }

    try {
      const res = await fetch(`${apiBase}/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      if (res.ok) {
        await fetchPendingApprovals()
      }
    } catch (err) {
      console.error('Failed to reject:', err)
    }
  }

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-slate-800">פעולות ממתינות</h2>
            {approvals.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {approvals.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchPendingApprovals}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="רענן"
          >
            <RefreshCcw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {useMock && (
          <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded">
            מצב דמו - API לא זמין
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">אין פעולות ממתינות לאישור</p>
            <p className="text-slate-400 text-xs mt-1">כל הפעולות אושרו</p>
          </div>
        ) : (
          approvals.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Export count hook for header badge
export function useApprovalsCount() {
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [count, setCount] = useState(0)
  const [apiBase, setApiBase] = useState(() => getStoredApiBase())

  useEffect(() => {
    const init = async () => {
      const detected = await detectApiBase([ENV_API])
      if (detected) setApiBase(detected)
    }
    init()
  }, [ENV_API])

  useEffect(() => {
    if (!apiBase) return

    const fetchCount = async () => {
      try {
        const res = await fetch(`${apiBase}/api/approvals`)
        if (res.ok) {
          const data = await res.json()
          const approvals = Array.isArray(data) ? data : data.approvals || []
          setCount(approvals.length)
        } else {
          // Use mock count when API unavailable
          setCount(MOCK_APPROVALS.length)
        }
      } catch {
        setCount(MOCK_APPROVALS.length)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [apiBase])

  return count
}
