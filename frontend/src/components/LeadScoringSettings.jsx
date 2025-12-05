import React, { useState, useEffect, useCallback } from 'react'
import { getStoredApiBase } from '../utils/apiBase.js'
import { Settings, Plus, Save, Trash2, RefreshCw } from 'lucide-react'

/**
 * LeadScoringSettings - Manage lead scoring rules
 * Allows editing point values for different signals
 */
export default function LeadScoringSettings() {
  const [apiBase] = useState(() => getStoredApiBase())
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [toast, setToast] = useState(null)

  // New rule form
  const [newRule, setNewRule] = useState({ signal: '', points: 0, name: '' })
  const [showNewForm, setShowNewForm] = useState(false)

  const loadRules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/marketing/scoring-rules`)
      if (!res.ok) throw new Error('Failed to load rules')
      const data = await res.json()
      setRules(data.rules || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const handlePointsChange = (signal, newPoints) => {
    setRules(prev => prev.map(r =>
      r.signal === signal ? { ...r, points: parseInt(newPoints) || 0 } : r
    ))
    setHasChanges(true)
  }

  const handleNameChange = (signal, newName) => {
    setRules(prev => prev.map(r =>
      r.signal === signal ? { ...r, name: newName } : r
    ))
    setHasChanges(true)
  }

  const handleToggleActive = (signal) => {
    setRules(prev => prev.map(r =>
      r.signal === signal ? { ...r, is_active: r.is_active ? 0 : 1 } : r
    ))
    setHasChanges(true)
  }

  const saveAllRules = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}/api/marketing/scoring-rules/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: rules.map(r => ({
            signal: r.signal,
            points: r.points,
            name: r.name,
            is_active: Boolean(r.is_active)
          }))
        })
      })
      if (!res.ok) throw new Error('Failed to save rules')
      setHasChanges(false)
      showToast('Rules saved successfully')
      await loadRules()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const addNewRule = async () => {
    if (!newRule.signal.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}/api/marketing/scoring-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: newRule.signal.trim().toLowerCase().replace(/\s+/g, '_'),
          points: newRule.points,
          name: newRule.name || newRule.signal,
          is_active: true
        })
      })
      if (!res.ok) throw new Error('Failed to add rule')
      setNewRule({ signal: '', points: 0, name: '' })
      setShowNewForm(false)
      showToast('Rule added')
      await loadRules()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const getScoreColor = (points) => {
    if (points > 0) return 'text-emerald-600 bg-emerald-50'
    if (points < 0) return 'text-rose-600 bg-rose-50'
    return 'text-slate-600 bg-slate-50'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-petrol" />
        <span className="mr-2 text-slate-500">Loading rules...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="lead-scoring-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-petrol/10">
            <Settings className="w-5 h-5 text-petrol" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Lead Scoring Rules</h2>
            <p className="text-sm text-slate-500">כללי ניקוד לידים</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button
              onClick={saveAllRules}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Base Score Info */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>Base Score: 50</strong> - Every lead starts with 50 points. Rules below add or subtract from this base.
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Active</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Signal</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Name (Hebrew)</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <tr key={rule.signal} className={!rule.is_active ? 'opacity-50' : ''}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(rule.is_active)}
                    onChange={() => handleToggleActive(rule.signal)}
                    className="w-4 h-4 rounded border-slate-300 text-petrol focus:ring-petrol"
                  />
                </td>
                <td className="px-4 py-3">
                  <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                    {rule.signal}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={rule.name || ''}
                    onChange={(e) => handleNameChange(rule.signal, e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                    dir="rtl"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={rule.points}
                      onChange={(e) => handlePointsChange(rule.signal, e.target.value)}
                      className={`w-20 px-2 py-1 text-center border border-slate-200 rounded focus:ring-2 focus:ring-petrol/20 focus:border-petrol ${getScoreColor(rule.points)}`}
                    />
                    <span className={`text-sm font-medium ${rule.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {rule.points >= 0 ? '+' : ''}{rule.points}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Score Thresholds Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
          <div className="text-2xl font-bold text-emerald-700">80-100</div>
          <div className="text-sm text-emerald-600">High Quality</div>
          <div className="text-xs text-emerald-500 mt-1">Priority follow-up</div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center">
          <div className="text-2xl font-bold text-amber-700">50-79</div>
          <div className="text-sm text-amber-600">Medium Quality</div>
          <div className="text-xs text-amber-500 mt-1">Standard follow-up</div>
        </div>
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-center">
          <div className="text-2xl font-bold text-rose-700">0-49</div>
          <div className="text-sm text-rose-600">Low Quality</div>
          <div className="text-xs text-rose-500 mt-1">Email only</div>
        </div>
      </div>

      {/* Add New Rule Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add New Scoring Rule</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Signal ID (English, snake_case)
                </label>
                <input
                  type="text"
                  value={newRule.signal}
                  onChange={(e) => setNewRule({ ...newRule, signal: e.target.value })}
                  placeholder="e.g., referral_lead"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Display Name (Hebrew)
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., ליד מהפניה"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Points (+/-)
                </label>
                <input
                  type="number"
                  value={newRule.points}
                  onChange={(e) => setNewRule({ ...newRule, points: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={addNewRule}
                disabled={!newRule.signal.trim() || saving}
                className="px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
