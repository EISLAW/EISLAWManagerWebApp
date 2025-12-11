import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getStoredApiBase } from '../utils/apiBase.js'
import {
  Target, Plus, Copy, ExternalLink, RefreshCw,
  ChevronRight, Check, AlertCircle, Link2, Settings
} from 'lucide-react'

/**
 * MarketingCampaigns - Manage marketing campaigns and tracking URLs
 */
export default function MarketingCampaigns() {
  const [apiBase] = useState(() => getStoredApiBase())
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(null)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    base_url: 'https://eislaw.org/appointment'
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/marketing/campaigns`)
      if (!res.ok) throw new Error('Failed to load campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  const createCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.utm_source.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}/api/marketing/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      })
      if (!res.ok) throw new Error('Failed to create campaign')
      setNewCampaign({
        name: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        base_url: 'https://eislaw.org/appointment'
      })
      setShowNewForm(false)
      showToast('קמפיין נוצר בהצלחה')
      await loadCampaigns()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const buildTrackingUrl = (campaign) => {
    const params = new URLSearchParams()
    if (campaign.utm_source) params.set('utm_source', campaign.utm_source)
    if (campaign.utm_medium) params.set('utm_medium', campaign.utm_medium)
    if (campaign.utm_campaign) params.set('utm_campaign', campaign.utm_campaign)
    if (campaign.utm_content) params.set('utm_content', campaign.utm_content)
    if (campaign.utm_term) params.set('utm_term', campaign.utm_term)
    const base = campaign.base_url || 'https://eislaw.org/appointment'
    return `${base}?${params.toString()}`
  }

  const copyToClipboard = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(id)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const getSourceIcon = (source) => {
    const icons = {
      facebook: '📘',
      google: '🔍',
      linkedin: '💼',
      instagram: '📷',
      email: '📧',
      whatsapp: '💬'
    }
    return icons[source?.toLowerCase()] || '🔗'
  }

  return (
    <div className="space-y-6" data-testid="marketing-campaigns">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/marketing" className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-2 rounded-lg bg-amber-50">
            <Target className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">ניהול קמפיינים</h1>
            <p className="text-sm text-slate-500">Campaign Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90"
          >
            <Plus className="w-4 h-4" />
            קמפיין חדש
          </button>
          <button
            onClick={loadCampaigns}
            className="p-2 hover:bg-slate-100 rounded-lg"
            title="רענן"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* UTM Builder Info */}
      <div className="card p-4 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-3">
          <Link2 className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">יוצר קישורי מעקב</h3>
            <p className="text-sm text-blue-600 mt-1">
              צור קישורים עם פרמטרי UTM לעקוב אחר מקור הלידים. כל קמפיין יקבל קישור ייחודי שתוכל לשתף בפרסומות.
            </p>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-petrol" />
          <span className="mr-2 text-slate-500">טוען קמפיינים...</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <Target className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-700 mb-1">אין קמפיינים עדיין</h3>
          <p className="text-sm text-slate-500 mb-4">צור את הקמפיין הראשון שלך כדי להתחיל לעקוב אחר לידים</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90"
          >
            <Plus className="w-4 h-4" />
            צור קמפיין
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => {
            const trackingUrl = buildTrackingUrl(campaign)
            return (
              <div key={campaign.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getSourceIcon(campaign.utm_source)}</span>
                    <div>
                      <h3 className="font-semibold text-slate-800">{campaign.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {campaign.utm_source}
                        </span>
                        {campaign.utm_medium && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {campaign.utm_medium}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    campaign.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {campaign.is_active ? 'פעיל' : 'לא פעיל'}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-800">{campaign.leads_count || 0}</div>
                    <div className="text-xs text-slate-500">לידים</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-800">{campaign.avg_score || '-'}</div>
                    <div className="text-xs text-slate-500">ציון ממוצע</div>
                  </div>
                </div>

                {/* Tracking URL */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">קישור מעקב:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyToClipboard(trackingUrl, campaign.id)}
                        className="p-1.5 hover:bg-slate-200 rounded"
                        title="העתק"
                      >
                        {copiedUrl === campaign.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-200 rounded"
                        title="פתח"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </a>
                    </div>
                  </div>
                  <code className="text-xs text-slate-600 break-all block">
                    {trackingUrl}
                  </code>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">קמפיין חדש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  שם הקמפיין *
                </label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="לדוגמה: פרסום פייסבוק ינואר"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  מקור (utm_source) *
                </label>
                <select
                  value={newCampaign.utm_source}
                  onChange={(e) => setNewCampaign({ ...newCampaign, utm_source: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                >
                  <option value="">בחר מקור</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="other">אחר</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  סוג מדיה (utm_medium)
                </label>
                <select
                  value={newCampaign.utm_medium}
                  onChange={(e) => setNewCampaign({ ...newCampaign, utm_medium: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                >
                  <option value="">בחר סוג</option>
                  <option value="cpc">CPC (מודעות בתשלום)</option>
                  <option value="social">Social (אורגני)</option>
                  <option value="email">Email</option>
                  <option value="referral">Referral</option>
                  <option value="organic">Organic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  שם הקמפיין ב-UTM (utm_campaign)
                </label>
                <input
                  type="text"
                  value={newCampaign.utm_campaign}
                  onChange={(e) => setNewCampaign({ ...newCampaign, utm_campaign: e.target.value })}
                  placeholder="לדוגמה: jan2025_promo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  כתובת יעד
                </label>
                <input
                  type="url"
                  value={newCampaign.base_url}
                  onChange={(e) => setNewCampaign({ ...newCampaign, base_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                ביטול
              </button>
              <button
                onClick={createCampaign}
                disabled={!newCampaign.name.trim() || !newCampaign.utm_source || saving}
                className="px-4 py-2 bg-petrol text-white rounded-lg hover:bg-petrol/90 disabled:opacity-50"
              >
                {saving ? 'יוצר...' : 'צור קמפיין'}
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
