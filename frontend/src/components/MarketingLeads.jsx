import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getStoredApiBase } from '../utils/apiBase.js'
import {
  Users, Search, Filter, Download, RefreshCw,
  ChevronLeft, ChevronRight, Phone, Mail, Building2,
  ExternalLink, AlertCircle
} from 'lucide-react'

/**
 * MarketingLeads - Table of all marketing leads with filters
 */
export default function MarketingLeads() {
  const [apiBase] = useState(() => getStoredApiBase())
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    source: '',
    scoreLevel: '',
    days: 30
  })
  const [sources, setSources] = useState([])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        days: filters.days.toString()
      })
      if (filters.search) params.set('search', filters.search)
      if (filters.source) params.set('source', filters.source)
      if (filters.scoreLevel) params.set('score_level', filters.scoreLevel)

      const res = await fetch(`${apiBase}/api/marketing/leads?${params}`)
      if (!res.ok) throw new Error('Failed to load leads')
      const data = await res.json()
      setLeads(data.leads || [])
      setTotalPages(data.total_pages || 1)

      // Get unique sources for filter
      const uniqueSources = [...new Set((data.leads || []).map(l => l.utm_source).filter(Boolean))]
      setSources(uniqueSources)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiBase, page, filters])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }))
    setPage(1)
  }

  const getScoreBadge = (score, level) => {
    const colors = {
      high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-rose-100 text-rose-700 border-rose-200'
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${colors[level] || colors.medium}`}>
        {score}
      </span>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Source', 'Score', 'Date']
    const rows = leads.map(l => [
      l.full_name || '',
      l.email || '',
      l.phone || '',
      l.company_name || '',
      l.utm_source || '',
      l.score || '',
      l.created_at || ''
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6" data-testid="marketing-leads">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/marketing" className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-2 rounded-lg bg-blue-50">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">כל הלידים</h1>
            <p className="text-sm text-slate-500">All Leads</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
          >
            <Download className="w-4 h-4" />
            ייצא CSV
          </button>
          <button
            onClick={loadLeads}
            className="p-2 hover:bg-slate-100 rounded-lg"
            title="רענן"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם, אימייל או חברה..."
              value={filters.search}
              onChange={handleSearch}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            />
          </div>

          <select
            value={filters.source}
            onChange={(e) => { setFilters(prev => ({ ...prev, source: e.target.value })); setPage(1) }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-petrol/20"
          >
            <option value="">כל המקורות</option>
            {sources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>

          <select
            value={filters.scoreLevel}
            onChange={(e) => { setFilters(prev => ({ ...prev, scoreLevel: e.target.value })); setPage(1) }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-petrol/20"
          >
            <option value="">כל הציונים</option>
            <option value="high">איכות גבוהה (80+)</option>
            <option value="medium">איכות בינונית (50-79)</option>
            <option value="low">איכות נמוכה (&lt;50)</option>
          </select>

          <select
            value={filters.days}
            onChange={(e) => { setFilters(prev => ({ ...prev, days: Number(e.target.value) })); setPage(1) }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-petrol/20"
          >
            <option value={7}>7 ימים</option>
            <option value={30}>30 ימים</option>
            <option value={90}>90 ימים</option>
            <option value={365}>שנה</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-petrol" />
          <span className="mr-2 text-slate-500">טוען לידים...</span>
        </div>
      )}

      {/* Leads Table */}
      {!loading && !error && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">שם</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">פרטי קשר</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">חברה</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">מקור</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">ציון</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">תאריך</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>לא נמצאו לידים</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{lead.full_name || '-'}</div>
                        {lead.service_type && (
                          <div className="text-xs text-slate-500">{lead.service_type}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-sm text-slate-600 hover:text-petrol">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </a>
                          )}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-sm text-slate-600 hover:text-petrol">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lead.company_name ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Building2 className="w-3 h-3" />
                            {lead.company_name}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="text-slate-700">{lead.utm_source || 'ישיר'}</div>
                          {lead.utm_campaign && (
                            <div className="text-xs text-slate-400">{lead.utm_campaign}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getScoreBadge(lead.score, lead.score_level)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                עמוד {page} מתוך {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  הקודם
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  הבא
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
