import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { detectApiBase, getStoredApiBase } from '../../utils/apiBase.js'

// Color palette from PRD
const COLORS = {
  petrol: '#1A5F5F',
  success: '#10B981',
  copper: '#B87333',
  danger: '#EF4444',
  slate: '#64748B',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  teal: '#14B8A6',
}

// Risk level colors
const RISK_COLORS = {
  high: COLORS.purple,
  mid: COLORS.amber,
  basic: COLORS.teal,
  lone: COLORS.slate,
}

// Task status colors
const STATUS_COLORS = {
  new: COLORS.petrol,
  in_progress: COLORS.copper,
  completed: COLORS.success,
  blocked: COLORS.danger,
}

function KPICard({ title, value, subtitle, color = 'petrol', onClick }) {
  const colorClasses = {
    petrol: 'bg-petrol/10 text-petrol border-petrol/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-right transition-all hover:shadow-md ${colorClasses[color] || colorClasses.petrol}`}
    >
      <div className="text-sm opacity-75">{title}</div>
      <div className="text-3xl font-bold mt-1">{value ?? '-'}</div>
      {subtitle && <div className="text-xs opacity-60 mt-1">{subtitle}</div>}
    </button>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Reports() {
  const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [apiBase, setApiBase] = useState(() => getStoredApiBase())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState('30')

  // Data state
  const [clients, setClients] = useState([])
  const [taskSummary, setTaskSummary] = useState(null)
  const [privacyStats, setPrivacyStats] = useState(null)

  // Initialize API
  useEffect(() => {
    const init = async () => {
      const detected = await detectApiBase([ENV_API])
      if (detected) setApiBase(detected)
    }
    init()
  }, [ENV_API])

  // Fetch data
  useEffect(() => {
    if (!apiBase) return

    const fetchData = async () => {
      setLoading(true)
      setError('')

      try {
        const [clientsRes, tasksRes, privacyRes] = await Promise.all([
          fetch(`${apiBase}/api/clients`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/tasks/summary`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${apiBase}/api/privacy/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
        ])

        setClients(Array.isArray(clientsRes) ? clientsRes : [])
        setTaskSummary(tasksRes)
        setPrivacyStats(privacyRes)
      } catch (err) {
        console.error('Error fetching report data:', err)
        setError('שגיאה בטעינת נתונים')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [apiBase, dateRange])

  // Computed values
  const activeClients = useMemo(() => {
    return clients.filter(c => c.active !== false).length
  }, [clients])

  const taskStatusData = useMemo(() => {
    if (!taskSummary) return []
    return [
      { name: 'חדש', value: taskSummary.new || 0, color: STATUS_COLORS.new },
      { name: 'בעבודה', value: taskSummary.in_progress || 0, color: STATUS_COLORS.in_progress },
      { name: 'הושלם', value: taskSummary.completed || 0, color: STATUS_COLORS.completed },
      { name: 'חסום', value: taskSummary.blocked || 0, color: STATUS_COLORS.blocked },
    ].filter(d => d.value > 0)
  }, [taskSummary])

  const privacyRiskData = useMemo(() => {
    if (!privacyStats?.by_level) return []
    const levels = privacyStats.by_level
    return [
      { name: 'גבוהה', value: levels.high || 0, color: RISK_COLORS.high },
      { name: 'בינונית', value: levels.mid || 0, color: RISK_COLORS.mid },
      { name: 'בסיסית', value: levels.basic || 0, color: RISK_COLORS.basic },
      { name: 'יחיד', value: levels.lone || 0, color: RISK_COLORS.lone },
    ].filter(d => d.value > 0)
  }, [privacyStats])

  const overdueCount = taskSummary?.overdue || 0
  const todayCount = taskSummary?.today || 0
  const privacyTotal = privacyStats?.total_submissions || 0
  const privacyPending = privacyStats?.by_status?.pending || 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">ANALYTICS</p>
          <h1 className="heading">דוחות ואנליטיקה</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white"
          >
            <option value="7">7 ימים</option>
            <option value="30">30 יום</option>
            <option value="90">90 יום</option>
          </select>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 min-h-[44px] bg-petrol text-white rounded-lg hover:bg-petrol/90 text-sm"
          >
            רענן
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-slate-500">טוען נתונים...</div>
      )}

      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            title="לקוחות פעילים"
            value={activeClients}
            subtitle="סה״כ במערכת"
            color="petrol"
          />
          <KPICard
            title="משימות פתוחות"
            value={(taskSummary?.new || 0) + (taskSummary?.in_progress || 0)}
            subtitle="חדש + בעבודה"
            color="slate"
          />
          <KPICard
            title="באיחור"
            value={overdueCount}
            subtitle="דורש טיפול מיידי"
            color={overdueCount > 0 ? 'danger' : 'success'}
          />
          <KPICard
            title="להיום"
            value={todayCount}
            subtitle="משימות לביצוע היום"
            color={todayCount > 0 ? 'amber' : 'slate'}
          />
          <KPICard
            title="בדיקות פרטיות"
            value={privacyTotal}
            subtitle={`${privacyPending} ממתינים`}
            color="petrol"
          />
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task Status Bar Chart */}
          <ChartCard
            title="משימות לפי סטטוס"
            subtitle="התפלגות כל המשימות"
          >
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={taskStatusData} layout="vertical" margin={{ right: 20 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip
                    formatter={(value) => [value, 'משימות']}
                    contentStyle={{ direction: 'rtl' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400">
                אין נתוני משימות זמינים
              </div>
            )}
          </ChartCard>

          {/* Privacy Risk Pie Chart */}
          <ChartCard
            title="התפלגות סיכון פרטיות"
            subtitle="לפי רמת אבטחה נדרשת"
          >
            {privacyRiskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={privacyRiskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {privacyRiskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, 'הגשות']}
                    contentStyle={{ direction: 'rtl' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    formatter={(value) => <span style={{ direction: 'rtl' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400">
                אין נתוני פרטיות זמינים
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* Summary Table */}
      {!loading && (
        <ChartCard title="סיכום מהיר" subtitle="נתונים עיקריים">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500">לקוחות פעילים</div>
              <div className="text-xl font-semibold">{activeClients}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500">משימות הושלמו</div>
              <div className="text-xl font-semibold text-emerald-600">{taskSummary?.completed || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500">משימות באיחור</div>
              <div className="text-xl font-semibold text-red-600">{overdueCount}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500">בדיקות פרטיות</div>
              <div className="text-xl font-semibold">{privacyTotal}</div>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Footer */}
      <div className="text-xs text-slate-400 text-center">
        נתונים עודכנו לאחרונה: {new Date().toLocaleString('he-IL')}
        {apiBase && <span className="mr-2">| API: {apiBase}</span>}
      </div>
    </div>
  )
}
