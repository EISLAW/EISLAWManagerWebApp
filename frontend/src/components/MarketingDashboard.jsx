import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getStoredApiBase } from '../utils/apiBase.js'
import {
  TrendingUp, Users, Target, BarChart3,
  RefreshCw, ChevronRight, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'

/**
 * MarketingDashboard - Overview of marketing leads and campaigns
 */
export default function MarketingDashboard() {
  const [apiBase] = useState(() => getStoredApiBase())
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState(30)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/marketing/leads/stats?days=${timeRange}`)
      if (!res.ok) throw new Error('Failed to load stats')
      const data = await res.json()
      setStats(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiBase, timeRange])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const getScoreLevelColor = (level) => {
    switch (level) {
      case 'high': return 'bg-emerald-500'
      case 'medium': return 'bg-amber-500'
      case 'low': return 'bg-rose-500'
      default: return 'bg-slate-400'
    }
  }

  const getScoreLevelLabel = (level) => {
    switch (level) {
      case 'high': return 'איכות גבוהה'
      case 'medium': return 'איכות בינונית'
      case 'low': return 'איכות נמוכה'
      default: return level
    }
  }

  const getTrendIcon = (trend) => {
    if (!trend || trend === 0) return <Minus className="w-4 h-4 text-slate-400" />
    if (trend > 0) return <ArrowUpRight className="w-4 h-4 text-emerald-500" />
    return <ArrowDownRight className="w-4 h-4 text-rose-500" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-petrol" />
        <span className="mr-2 text-slate-500">טוען נתונים...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadStats}
          className="mt-3 text-sm text-rose-600 underline"
        >
          נסה שוב
        </button>
      </div>
    )
  }

  const totalLeads = stats?.total_leads || 0
  const byLevel = stats?.by_level || {}
  const bySource = stats?.by_source || {}
  const avgScore = stats?.avg_score || 0

  return (
    <div className="space-y-6" data-testid="marketing-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-petrol/10">
            <BarChart3 className="w-6 h-6 text-petrol" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">דשבורד שיווק</h1>
            <p className="text-sm text-slate-500">Marketing Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-petrol/20"
          >
            <option value={7}>7 ימים אחרונים</option>
            <option value={30}>30 ימים אחרונים</option>
            <option value={90}>90 ימים אחרונים</option>
          </select>
          <button
            onClick={loadStats}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="רענן"
          >
            <RefreshCw className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            {getTrendIcon(stats?.trend)}
          </div>
          <div className="text-3xl font-bold text-slate-800">{totalLeads}</div>
          <div className="text-sm text-slate-500">סה"כ לידים</div>
        </div>

        {/* Average Score */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{avgScore.toFixed(0)}</div>
          <div className="text-sm text-slate-500">ציון ממוצע</div>
        </div>

        {/* High Quality Leads */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-600">{byLevel.high || 0}</div>
          <div className="text-sm text-slate-500">לידים איכותיים</div>
        </div>

        {/* Sources Count */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{Object.keys(bySource).length}</div>
          <div className="text-sm text-slate-500">מקורות פעילים</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">התפלגות איכות לידים</h2>
          <div className="space-y-4">
            {['high', 'medium', 'low'].map(level => {
              const count = byLevel[level] || 0
              const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0
              return (
                <div key={level}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{getScoreLevelLabel(level)}</span>
                    <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getScoreLevelColor(level)} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sources Breakdown */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">מקורות לידים</h2>
          {Object.keys(bySource).length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>אין נתונים עדיין</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(bySource)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-petrol" />
                      <span className="text-sm text-slate-700">{source || 'ישיר'}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800">{count}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/marketing/leads"
          className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">צפה בכל הלידים</div>
              <div className="text-xs text-slate-500">View All Leads</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-petrol transition-colors" />
        </Link>

        <Link
          to="/marketing/campaigns"
          className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">ניהול קמפיינים</div>
              <div className="text-xs text-slate-500">Manage Campaigns</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-petrol transition-colors" />
        </Link>

        <Link
          to="/marketing/insights"
          className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">תובנות AI</div>
              <div className="text-xs text-slate-500">AI Insights</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-petrol transition-colors" />
        </Link>
      </div>

      {/* Recent Leads Preview */}
      {stats?.recent_leads && stats.recent_leads.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">לידים אחרונים</h2>
            <Link to="/marketing/leads" className="text-sm text-petrol hover:underline">
              הצג הכל
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">שם</th>
                  <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">מקור</th>
                  <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">ציון</th>
                  <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">תאריך</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_leads.slice(0, 5).map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{lead.full_name || lead.email}</div>
                      {lead.company_name && (
                        <div className="text-xs text-slate-500">{lead.company_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {lead.utm_source || 'ישיר'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lead.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        lead.score >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString('he-IL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
