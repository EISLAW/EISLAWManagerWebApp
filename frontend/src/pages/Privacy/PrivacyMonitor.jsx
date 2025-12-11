import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import Card from '../../components/Card'

const levelColor = {
  basic: 'bg-yellow-400',
  lone: 'bg-yellow-400',
  mid: 'bg-orange-500',
  high: 'bg-red-500',
}

const levelLabel = {
  basic: 'בסיסית',
  lone: 'יחיד',
  mid: 'בינונית',
  high: 'גבוהה',
}

export default function PrivacyMonitor({ apiBase }) {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        axios.get(`${apiBase}/api/privacy/stats`),
        axios.get(`${apiBase}/api/privacy/activity?limit=20`)
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data.activities || [])
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch monitor data:', err)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchData()
    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [fetchData, autoRefresh])

  if (loading && !stats) {
    return (
      <Card className="mb-4">
        <div className="text-center py-4 text-slate-500">טוען נתוני ניטור...</div>
      </Card>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-slate-800">{stats?.total_submissions || 0}</div>
          <div className="text-xs text-slate-500">סה"כ הגשות</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-green-600">{stats?.submissions_today || 0}</div>
          <div className="text-xs text-slate-500">היום</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-yellow-500">{stats?.by_level?.basic || 0}</div>
          <div className="text-xs text-slate-500">בסיסית (צהוב)</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-orange-500">{stats?.by_level?.mid || 0}</div>
          <div className="text-xs text-slate-500">בינונית (כתום)</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-red-500">{stats?.by_level?.high || 0}</div>
          <div className="text-xs text-slate-500">גבוהה (אדום)</div>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-slate-800">יומן פעילות</h3>
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="form-checkbox h-3 w-3"
              />
              <span className="text-slate-500">רענון אוטומטי</span>
            </label>
            {lastUpdate && (
              <span className="text-slate-400">
                {lastUpdate.toLocaleTimeString('he-IL')}
              </span>
            )}
            <button 
              onClick={fetchData}
              className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 min-h-[44px]"
            >
              רענן
            </button>
          </div>
        </div>

        {activity.length === 0 ? (
          <div className="text-center py-4 text-slate-400">אין פעילות אחרונה</div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-right text-slate-500 border-b">
                  <th className="pb-2 font-medium">זמן</th>
                  <th className="pb-2 font-medium">אירוע</th>
                  <th className="pb-2 font-medium">הגשה</th>
                  <th className="pb-2 font-medium">רמה</th>
                  <th className="pb-2 font-medium">משך</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((act, i) => {
                  const details = typeof act.details === 'string' 
                    ? JSON.parse(act.details || '{}') 
                    : (act.details || {})
                  return (
                    <tr key={act.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 text-slate-600">{act.timestamp?.split(' ')[1] || ''}</td>
                      <td className="py-2">
                        <span className={act.success ? 'text-green-600' : 'text-red-600'}>
                          {act.event_type === 'webhook_received' && '✓ קבלה'}
                          {act.event_type === 'webhook_duplicate' && '⚡ כפילות'}
                          {act.event_type === 'webhook_error' && '✗ שגיאה'}
                          {act.event_type === 'results_viewed' && '👁 צפייה'}
                          {!['webhook_received', 'webhook_duplicate', 'webhook_error', 'results_viewed'].includes(act.event_type) && act.event_type}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-500">
                        {act.submission_id?.slice(0, 8) || '-'}
                      </td>
                      <td className="py-2">
                        {details.level && (
                          <span className={`inline-block w-2 h-2 rounded-full ${levelColor[details.level] || 'bg-gray-400'}`}></span>
                        )}
                      </td>
                      <td className="py-2 text-slate-400 text-xs">
                        {act.duration_ms ? `${act.duration_ms}ms` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Errors Alert */}
      {stats?.errors_24h > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          ⚠️ {stats.errors_24h} שגיאות ב-24 שעות האחרונות
        </div>
      )}
    </div>
  )
}
