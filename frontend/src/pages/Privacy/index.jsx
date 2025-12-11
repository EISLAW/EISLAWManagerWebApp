import React, { useEffect, useMemo, useState } from 'react'
import { ALGORITHM_FIELDS, LEVEL_EXPLANATIONS, DPO_EXPLANATIONS } from './constants'
import axios from 'axios'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import PrivacyMonitor from './PrivacyMonitor'

const levelLabel = (lvl) => {
  if (lvl === 'lone') return 'יחיד'
  if (lvl === 'basic') return 'בסיסית'
  if (lvl === 'mid') return 'בינונית'
  if (lvl === 'high') return 'גבוהה'
  return lvl || ''
}

// Status icon component
const StatusIcon = ({ status }) => {
  if (status === 'correct') return <span className="text-success font-bold">✓</span>
  if (status === 'override') return <span className="text-copper font-bold">✗</span>
  return <span className="text-slate-400">○</span>
}

export default function Privacy() {
  const formId = import.meta?.env?.VITE_PRIVACY_FORM_ID || 't9nJNoMdBgus'
  const [items, setItems] = useState([])
  const [labels, setLabels] = useState({})
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [selectedModules, setSelectedModules] = useState({})
  const [showEmail, setShowEmail] = useState(false)
  const [emailPreview, setEmailPreview] = useState({ subject: '', body: '' })
  const [APIBase, setAPIBase] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [perChangeNotes, setPerChangeNotes] = useState({})
  const [metrics, setMetrics] = useState(null)
  const [publishInfo, setPublishInfo] = useState(null)
  const [levelSel, setLevelSel] = useState('')
  const [busySave, setBusySave] = useState(false)
  const [busySend, setBusySend] = useState(false)
  const [busyPublish, setBusyPublish] = useState(false)
  const [toast, setToast] = useState(null)
  const [showMonitor, setShowMonitor] = useState(true)
  const [showOverride, setShowOverride] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)

  // Track review status per submission (local state for now)
  const [reviewStatus, setReviewStatus] = useState({}) // { submissionId: 'pending' | 'correct' | 'override' | 'sent' }

  const reqMap = {
    worker_security_agreement: 'התחייבות/מדיניות אבטחת עובדים',
    cameras_policy: 'מדיניות מצלמות',
    consultation_call: 'שיחת ייעוץ/אימות',
    outsourcing_text: 'הנחיות מיקור חוץ (Processor)',
    direct_marketing_rules: 'כללי דיוור ישיר',
  }

  // Key fields to display in the inputs summary
  const KEY_FIELDS = [
    'owners', 'access', 'ppl', 'sensitive_people', 'sensitive_types',
    'biometric_100k', 'transfer', 'directmail_biz', 'processor', 'cameras'
  ]

  const fmtVal = (v) => {
    if (v === true) return 'כן'
    if (v === false) return 'לא'
    if (Array.isArray(v)) return v.join(', ')
    return v ?? ''
  }

  const showToast = (text, type = 'info', ttlMs = 3000) => {
    setToast({ text, type })
    if (ttlMs > 0) {
      setTimeout(() => setToast(null), ttlMs)
    }
  }

  const pickApiBase = async () => {
    const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
    const bases = []
    if (MODE === 'LOCAL' && ENV_API) bases.push(ENV_API)
    if (ENV_API) bases.push(ENV_API)
    bases.push('http://127.0.0.1:8788', 'http://localhost:8788', 'https://eislaw-api-01.azurewebsites.net')
    for (const b of bases) {
      try { const r = await fetch(`${b}/health`); if (r.ok) { setAPIBase(b); return b } } catch {}
    }
    setAPIBase(''); return ''
  }

  const loadData = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true)
    setLoading(true); setError('')
    try {
      const API = await pickApiBase() || ''
      const [lab, sub, met] = await Promise.all([
        axios.get(`${API}/api/privacy/labels`),
        axios.get(`${API}/api/privacy/submissions`, { params: { limit: 50 } }),
        axios.get(`${API}/api/privacy/metrics`, { params: { window: 10 } }).catch(() => ({ data: null })),
      ])
      setLabels(lab.data.labels || {})
      setItems(sub.data.submissions || [])
      setMetrics(met && met.data ? met.data : null)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(false)
  }, [formId])

  useEffect(() => {
    if (items && items.length > 0 && !openId && !loading) {
      openCard(items[0].submission_id)
    }
  }, [items, openId, loading])

  const openCard = async (id) => {
    if (openId === id) { setOpenId(null); setDetail(null); return }
    setOpenId(id); setDetail(null); setShowOverride(false); setShowEmail(false); setPublishInfo(null)
    
    try {
      // Fetch full detail from API
      const API = APIBase || await pickApiBase() || ""
      const res = await axios.get(`${API}/api/privacy/submissions/${id}`)
      const sub = res.data
      
      // Map API response to detail state
      const detail = {
        submission_id: sub.submission_id || sub.id,
        business_name: sub.business_name,
        contact_name: sub.contact_name,
        contact_email: sub.contact_email,
        contact_phone: sub.contact_phone,
        submitted_at: sub.submitted_at,
        answers: sub.answers || {},
        score: sub.score || {
          level: sub.level,
          dpo: sub.dpo,
          reg: sub.reg,
          report: sub.report,
          requirements: []
        },
        review_status: sub.status
      }
      setDetail(detail)
      setLevelSel(sub.score?.level || sub.level || "")
      const initial = { DPO: !!(sub.score?.dpo || sub.dpo), Registration: !!(sub.score?.reg || sub.reg), Report: !!(sub.score?.report || sub.report) }
      if (sub.score?.requirements) {
        sub.score.requirements.forEach(r => { initial[r] = true })
      }
      setSelectedModules(initial)
      setOverrideReason("")
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    }
  }

  const toggle = (key) => setSelectedModules(prev => ({ ...prev, [key]: !prev[key] }))

  const selectedList = useMemo(() => {
    const arr = Object.keys(selectedModules).filter(k => selectedModules[k])
    const lvl = (levelSel || (detail && detail.score && detail.score.level) || '').trim()
    if (lvl) arr.unshift(`level_${lvl}`)
    return arr
  }, [selectedModules, levelSel, detail])

  const refresh = async () => {
    setRefreshing(true)
    setOpenId(null)
    setDetail(null)
    setPublishInfo(null)
    setSelectedModules({})
    setLevelSel('')
    setShowEmail(false)
    setShowOverride(false)
    setEmailPreview({ subject: '', body: '' })
    await loadData(true)
  }

  // Mark as correct and advance to next
  const markCorrect = async () => {
    if (!detail) return
    try {
      setBusySave(true)
      const API = APIBase || ""
      await axios.post(`${API}/api/privacy/save_review`, null, {
        params: {
          submission_id: detail.submission_id,
          status: "correct"
        }
      })

      // Update local status
      setReviewStatus(prev => ({ ...prev, [detail.submission_id]: "correct" }))
      showToast("סומן כנכון ✓", "success")

      // Refresh metrics
      const met = await axios.get(`${API}/api/privacy/metrics`)
      setMetrics(met.data)

      // Auto-advance to next pending item
      const currentIndex = items.findIndex(it => it.submission_id === detail.submission_id)
      const nextPending = items.find((it, idx) => idx > currentIndex && reviewStatus[it.submission_id] !== "correct" && reviewStatus[it.submission_id] !== "override")
      if (nextPending) {
        openCard(nextPending.submission_id)
      }
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setBusySave(false) }
  }

  const previewEmail = async () => {
    if (!detail) return
    try {
      const API = APIBase || ""
      const res = await axios.post(`${API}/api/privacy/preview_email/${detail.submission_id}`)
      setEmailPreview(res.data); setShowEmail(true)
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
  }

  const saveReview = async (status = "reviewed") => {
    if (!detail) return
    try {
      setBusySave(true)
      const API = APIBase || ""
      await axios.post(`${API}/api/privacy/save_review`, null, {
        params: {
          submission_id: detail.submission_id,
          override_level: levelSel || (detail.score?.level || ""),
          notes: overrideReason || undefined,
          status: status
        }
      })

      // Update local status
      if (status === "override" || overrideReason) {
        setReviewStatus(prev => ({ ...prev, [detail.submission_id]: "override" }))
      }

      showToast("נשמר בהצלחה", "success")
      const met = await axios.get(`${API}/api/privacy/metrics`)
      setMetrics(met.data)
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setBusySave(false) }
  }

  const approvePublish = async () => {
    if (!detail) return
    try {
      setBusyPublish(true)
      const API = APIBase || ""
      const res = await axios.post(`${API}/api/privacy/approve_and_publish/${detail.submission_id}`)
      setPublishInfo(res.data)
      showToast("הדוח פורסם", "success")
      return res.data
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setBusyPublish(false) }
  }

  const copyText = async (t) => { try { await navigator.clipboard.writeText(t); showToast('הועתק', 'success') } catch { showToast(t, 'info', 2000) } }

  const copyWhatsAppLink = async () => {
    if (!publishInfo?.share_url) return
    const msg = `שלום ${detail?.answers?.contact_name||''}, הדו"ח מוכן עבור ${detail?.answers?.business_name||''} – קישור: ${publishInfo.share_url}`
    const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`
    await copyText(wa)
  }

  const sendEmail = async () => {
    if (!detail) return
    try {
      if (!publishInfo || !publishInfo.report_url) {
        if (!confirm("לפרסם את הדוח לפני שליחת המייל?")) {
          showToast("יש לפרסם את הדוח קודם", "warn")
          return
        }
        const pub = await approvePublish()
        if (!pub || !pub.report_url) {
          showToast("הפרסום נכשל", "error")
          return
        }
      }
      setBusySend(true)
      const API = APIBase || ""
      await axios.post(`${API}/api/privacy/send_email/${detail.submission_id}`)
      showToast("המייל נשלח", "success")

      // Update status to sent
      setReviewStatus(prev => ({ ...prev, [detail.submission_id]: "sent" }))

      try {
        // Save review status as sent
        await axios.post(`${API}/api/privacy/save_review`, null, {
          params: {
            submission_id: detail.submission_id,
            status: "sent"
          }
        })
        const met = await axios.get(`${API}/api/privacy/metrics`)
        setMetrics(met.data)
      } catch { }
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setBusySend(false) }
  }

  // Calculate review stats
  const reviewedCount = Object.values(reviewStatus).filter(s => s === 'correct' || s === 'override' || s === 'sent').length
  const totalCount = items.length

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading">פרטיות - בדיקת אלגוריתם</h1>
        <div className="flex items-center gap-3">
          {metrics && (
            <Badge variant="primary">
              דיוק: {metrics.accuracy_overall != null ? Math.round(metrics.accuracy_overall*100) + '%' : '-'}
            </Badge>
          )}
          <button
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm min-h-[44px] min-w-[44px]"
            disabled={refreshing}
            onClick={refresh}
          >
            {refreshing ? 'מרענן…' : 'רענן'}
          </button>
        </div>
      </div>

      {/* Monitor Panel Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowMonitor(!showMonitor)}
          className={`px-3 py-1 min-h-[44px] rounded-lg text-sm ${showMonitor ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}
        >
          {showMonitor ? '📊 ניטור פעיל' : '📊 הצג ניטור'}
        </button>
      </div>

      {/* Monitor Panel */}
      {showMonitor && APIBase && <PrivacyMonitor apiBase={APIBase} />}

      {/* Error & Toast */}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>}
      {loading && <div className="text-center py-4">טוען…</div>}
      {toast && (
        <div className={`fixed top-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'warn' ? 'bg-yellow-500 text-black' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Main Grid - RTL: List on RIGHT, Detail on LEFT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* RIGHT PANEL: Submissions List + Metrics */}
        <aside className="md:col-span-4 space-y-4 md:order-2">
          {/* Sidebar Metrics */}
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-petrol">{reviewedCount}/{totalCount}</div>
              <div className="text-sm text-slate-600">נבדקו</div>
              {metrics && (
                <div className="mt-2 text-sm">
                  <span className="text-slate-600">דיוק כללי: </span>
                  <span className="font-semibold">{metrics.accuracy_overall != null ? Math.round(metrics.accuracy_overall*100) + '%' : '-'}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Submissions List */}
          <div className="space-y-2">
            {(items || []).map(it => (
              <div
                key={it.submission_id}
                className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                  openId === it.submission_id
                    ? 'border-petrol bg-petrol/5'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                onClick={() => openCard(it.submission_id)}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={reviewStatus[it.submission_id]} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-offblack truncate">
                      {it.contact_name || it.business_name || it.contact_email || "ללא שם"}
                    </div>
                    <div className="text-xs text-slate-500 truncate" dir="ltr">
                      {it.contact_email}
                    </div>
                  </div>
                  <Badge>{levelLabel(it.level)}</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="text-xs text-slate-500 text-center">
            ○ ממתין · <span className="text-success">✓</span> אושר · <span className="text-copper">✗</span> תוקן
          </div>
        </aside>

        {/* LEFT PANEL: Detail View */}
        <main className="md:col-span-8 md:order-1 space-y-4">
          {openId && detail ? (
            <>
              {/* Algorithm Decision Card - PROMINENT */}
              <Card className="border-2 border-petrol/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-petrol">החלטת האלגוריתם</div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">רמה:</span>
                      <Badge variant="primary">{levelLabel(detail.score?.level)}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={detail.score?.dpo ? 'success' : 'neutral'}>DPO</Badge>
                      <Badge variant={detail.score?.reg ? 'success' : 'neutral'}>רישום</Badge>
                      <Badge variant={detail.score?.report ? 'success' : 'neutral'}>דוח/PIA</Badge>
                    </div>
                  </div>

                  {/* Big "Correct" Button */}
                  <button
                    onClick={markCorrect}
                    disabled={busySave}
                    className="px-8 py-4 bg-success hover:bg-success/90 text-white rounded-xl text-xl font-bold min-h-[60px] disabled:opacity-60 transition-colors"
                  >
                    {busySave ? '…' : '✓ נכון'}
                  </button>
                </div>
              </Card>

              {/* Contact Info */}
              <Card title="פרטי פנייה">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="text-slate-600 py-1 w-20">שם:</td>
                      <td className="font-medium py-1">{detail.contact_name || "לא צוין"}</td>
                    </tr>
                    <tr>
                      <td className="text-slate-600 py-1">עסק:</td>
                      <td className="font-medium py-1">{detail.business_name || "לא צוין"}</td>
                    </tr>
                    <tr>
                      <td className="text-slate-600 py-1">אימייל:</td>
                      <td className="font-medium py-1" dir="ltr">{detail.contact_email || "לא צוין"}</td>
                    </tr>
                    <tr>
                      <td className="text-slate-600 py-1">טלפון:</td>
                      <td className="font-medium py-1" dir="ltr">{detail.contact_phone || "לא צוין"}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-2 text-xs text-slate-500 border-t pt-2">
                  ID: {detail.submission_id} · נשלח: {new Date(detail.submitted_at).toLocaleString('he-IL')}
                </div>
              </Card>
{/* All Questionnaire Answers - Show ALL algorithm fields */}
              <Card>
                <button
                  onClick={() => setShowQuestionnaire(!showQuestionnaire)}
                  className="w-full min-h-[44px] flex items-center justify-between text-right"
                >
                  <h3 className="font-bold text-lg text-petrol">תשובות לשאלון (כל הפרמטרים)</h3>
                  <span className="text-slate-400 text-sm">{showQuestionnaire ? "▲ הסתר" : "▼ הצג 18 שדות"}</span>
                </button>
                {showQuestionnaire && (
                <div className="space-y-1 mt-4 pt-4 border-t">
                  {ALGORITHM_FIELDS.map(k => { 
                    const v = detail.answers?.[k];
                    const hasValue = v !== undefined && v !== null && v !== "";
                    return (
                      <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 text-sm flex-1 text-right pr-4">{labels[k] || k}</span>
                        <span className={hasValue ? "font-semibold text-offblack min-w-[100px] text-right" : "text-slate-400 italic min-w-[100px] text-right"}>
                          {hasValue ? fmtVal(v) : "לא צוין"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                )}
              </Card>

              {/* Scoring Result */}
              <Card>
                <h3 className="font-bold text-lg mb-4 text-petrol">תוצאת הניקוד</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-xl border-2 shadow-sm" style={{
                    backgroundColor: detail.score?.color === 'red' ? '#fee2e2' : detail.score?.color === 'orange' ? '#ffedd5' : '#fef9c3',
                    borderColor: detail.score?.color === 'red' ? '#ef4444' : detail.score?.color === 'orange' ? '#f97316' : '#eab308'
                  }}>
                    <div className="text-sm text-slate-600 mb-1">רמה</div>
                    <div className="text-3xl font-bold">{levelLabel(detail.score?.level)}</div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={detail.score?.dpo ? 'text-green-600 font-bold' : 'text-slate-400'}>
                          {detail.score?.dpo ? '✓' : '✗'}
                        </span>
                        <span>ממונה פרטיות (DPO)</span>
                      </div>
                      {detail.score?.dpo && (
                        <div className="mr-6 mt-1 text-xs text-slate-500">
                          נדרש עקב: {DPO_EXPLANATIONS.slice(0, 2).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={detail.score?.reg ? 'text-green-600 font-bold' : 'text-slate-400'}>
                        {detail.score?.reg ? '✓' : '✗'}
                      </span>
                      <span>רישום מאגר</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={detail.score?.report ? 'text-green-600 font-bold' : 'text-slate-400'}>
                        {detail.score?.report ? '✓' : '✗'}
                      </span>
                      <span>דיווח</span>
                    </div>
                  </div>
                </div>
                {detail.score?.requirements?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-slate-600 mb-2">דרישות נוספות:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {detail.score.requirements.map((r, i) => (
                        <li key={i} className="text-sm">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Why this level? */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-semibold text-slate-700 mb-2">למה רמה זו?</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                    {(detail.score?.level_reasons || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* Override Section - Collapsible */}
              <Card>
                <button
                  onClick={() => setShowOverride(!showOverride)}
                  className="w-full min-h-[44px] flex items-center justify-between text-right"
                >
                  <span className="font-semibold text-copper">אם לא נכון - תקן</span>
                  <span className="text-slate-400">{showOverride ? '▲' : '▼'}</span>
                </button>

                {showOverride && (
                  <div className="mt-4 space-y-4 pt-4 border-t">
                    {/* Level Selection */}
                    <div>
                      <div className="font-semibold mb-2">רמה נכונה:</div>
                      <div className="flex flex-wrap gap-2">
                        {['lone', 'basic', 'mid', 'high'].map(lvl => (
                          <label key={lvl} className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-slate-50">
                            <input
                              type="radio"
                              name="levelSel"
                              checked={levelSel === lvl}
                              onChange={() => setLevelSel(lvl)}
                            />
                            {levelLabel(lvl)}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Components */}
                    <div>
                      <div className="font-semibold mb-2">רכיבים:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={!!selectedModules.DPO} onChange={() => toggle('DPO')} />
                          DPO
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={!!selectedModules.Registration} onChange={() => toggle('Registration')} />
                          רישום
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={!!selectedModules.Report} onChange={() => toggle('Report')} />
                          דוח/PIA
                        </label>
                      </div>

                      <div className="mt-3 pt-3 border-t space-y-2">
                        {['worker_security_agreement','cameras_policy','consultation_call','outsourcing_text','direct_marketing_rules'].map(k => (
                          <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={!!selectedModules[k]} onChange={() => toggle(k)} />
                            {reqMap[k] || k}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Override Note */}
                    <div>
                      <div className="font-semibold mb-2">הערה:</div>
                      <textarea
                        className="w-full p-3 rounded-lg border focus:border-petrol focus:ring-1 focus:ring-petrol"
                        rows={3}
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        placeholder="הסבר מדוע האלגוריתם טעה…"
                      />
                    </div>

                    <button
                      onClick={() => saveReview('override')}
                      disabled={busySave}
                      className="px-4 py-2 bg-copper hover:bg-copper/90 text-white rounded-lg min-h-[44px] disabled:opacity-60"
                    >
                      {busySave ? 'שומר…' : 'שמור תיקון'}
                    </button>
                  </div>
                )}
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 px-4 py-3 rounded-lg bg-petrol hover:bg-petrol/90 text-white min-h-[44px] disabled:opacity-60"
                  disabled={busySave || busyPublish || busySend}
                  onClick={() => saveReview('approved')}
                >
                  {busySave ? 'שומר…' : 'שמור הערכה'}
                </button>
                <button
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-petrol text-petrol hover:bg-petrol/5 min-h-[44px] disabled:opacity-60"
                  disabled={busySend || busyPublish}
                  onClick={sendEmail}
                >
                  {busySend ? 'שולח…' : 'אשר ושלח ללקוח'}
                </button>
              </div>

              {/* Additional Actions (collapsed by default) */}
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-600 hover:text-petrol">פעולות נוספות…</summary>
                <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 rounded bg-slate-200 hover:bg-slate-300 min-h-[44px]"
                      onClick={previewEmail}
                    >
                      תצוגה מקדימה
                    </button>
                    <button
                      className="px-3 py-2 rounded bg-slate-200 hover:bg-slate-300 min-h-[44px]"
                      disabled={busyPublish}
                      onClick={approvePublish}
                    >
                      {busyPublish ? 'מפרסם…' : 'פרסם דוח'}
                    </button>
                  </div>

                  {showEmail && (
                    <div className="p-3 bg-white rounded border">
                      <div className="font-semibold">נושא:</div>
                      <div className="text-sm mb-2">{emailPreview.subject}</div>
                      <div className="font-semibold">תוכן:</div>
                      <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-2 rounded">{emailPreview.body}</pre>
                    </div>
                  )}

                  {publishInfo && (
                    <div className="p-3 bg-white rounded border space-y-2">
                      <div className="font-semibold">קישורים</div>
                      <div className="text-sm break-all" dir="ltr">
                        <a className="text-petrol underline" href={publishInfo.report_url} target="_blank" rel="noreferrer">{publishInfo.report_url}</a>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm min-h-[44px]" onClick={() => copyText(publishInfo.report_url)}>העתק קישור</button>
                        <button className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm min-h-[44px]" onClick={() => copyText(publishInfo.share_url)}>העתק קצר</button>
                        <button className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm min-h-[44px]" onClick={copyWhatsAppLink}>WhatsApp</button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </>
          ) : (
            <Card className="text-center py-8">
              <div className="text-slate-600">בחר פנייה מהרשימה כדי לבדוק את החלטת האלגוריתם</div>
              <div className="text-xs text-slate-400 mt-2">הפנייה הראשונה נפתחת אוטומטית</div>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
