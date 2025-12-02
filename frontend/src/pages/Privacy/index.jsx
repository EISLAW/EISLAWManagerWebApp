import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const levelLabel = (lvl) => {
  if (lvl === 'lone') return 'יחיד'
  if (lvl === 'basic') return 'בסיסית'
  if (lvl === 'mid') return 'בינונית'
  if (lvl === 'high') return 'גבוהה'
  return lvl || ''
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
  const reqMap = {
    worker_security_agreement: 'התחייבות/מדיניות אבטחת עובדים',
    cameras_policy: 'מדיניות מצלמות',
    consultation_call: 'שיחת ייעוץ/אימות',
    outsourcing_text: 'הנחיות מיקור חוץ (Processor)',
    direct_marketing_rules: 'כללי דיוור ישיר',
  }

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
        axios.get(`${API}/privacy/labels`),
        axios.get(`${API}/privacy/submissions`, { params: { form_id: formId, limit: 20 } }),
        axios.get(`${API}/privacy/metrics`, { params: { window: 10 } }).catch(() => ({ data: null })),
      ])
      setLabels(lab.data.labels || {})
      setItems(sub.data.items || [])
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
    setOpenId(id); setDetail(null)
    try {
      const API = (APIBase || '')
      const res = await axios.get(`${API}/privacy/submissions/${id}`, { params: { form_id: formId } })
      setDetail(res.data)
      const s = res.data.score || {}
      setLevelSel(s.level || '')
      const initial = { DPO: !!s.dpo, Registration: !!s.reg, Report: !!s.report }
      ;(s.requirements || []).forEach(r => { initial[r] = true })
      setSelectedModules(initial)
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    
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
    setEmailPreview({ subject: '', body: '' })
    await loadData(true)
  }

  const previewEmail = async () => {
    if (!detail) return
    try {
      const payload = {
        contact_name: detail.answers?.contact_name,
        business_name: detail.answers?.business_name,
        score: detail.score,
        selected_modules: selectedList,
        selected_level: levelSel || (detail.score?.level || ''),
        report_url: (publishInfo && publishInfo.report_url) ? publishInfo.report_url : '',
      }
      const API = (APIBase || '')
      const res = await axios.post(`${API}/privacy/preview_email`, payload)
      setEmailPreview(res.data); setShowEmail(true)
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    
  }

  const saveReview = async () => {
    if (!detail) return
    try {

      setBusySave(true)
      const payload = {
        submission_id: detail.submission_id,
        form_id: formId,
        selected_modules: selectedList,
        selected_level: levelSel || (detail.score?.level || ''),
        report_url: (publishInfo && publishInfo.report_url) ? publishInfo.report_url : '',
        status: 'approved',
        override_reason: overrideReason,
        per_change_notes: perChangeNotes,
      }
      const API = (APIBase || '')
      await axios.post(`${API}/privacy/save_review`, payload)
      showToast('Saved review', 'success')
      const met = await axios.get(`${API}/privacy/metrics`, { params: { window: 10 } })
      setMetrics(met.data)
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setBusySave(false) }
  }

  const approvePublish = async () => {
    if (!detail) return
    try {

      setBusyPublish(true)
      const API = (APIBase || '')
      const payload = {
        submission_id: detail.submission_id,
        form_id: formId,
        selected_modules: selectedList,
        selected_level: levelSel || (detail.score?.level || ''),
      }
      const res = await axios.post(`${API}/privacy/approve_and_publish`, payload)
      setPublishInfo(res.data)
      showToast('Report published', 'success')
      return res.data
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setBusyPublish(false) }
  }

  const copyText = async (t) => { try { await navigator.clipboard.writeText(t); showToast('Copied', 'success') } catch { showToast(t, 'info', 2000) } }
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
        if (!confirm('Publish the report before sending the email?')) {
          showToast('Publish the report first', 'warn')
          return
        }
        const pub = await approvePublish()
        if (!pub || !pub.report_url) {
          showToast('Publish failed', 'error')
          return
        }
      }
      setBusySend(true)
      const payload = {
        contact_name: detail.answers?.contact_name,
        business_name: detail.answers?.business_name,
        contact_email: detail.answers?.contact_email,
        score: detail.score,
        selected_modules: selectedList,
        selected_level: levelSel || (detail.score?.level || ''),
        report_url: (publishInfo && publishInfo.report_url) ? publishInfo.report_url : '',
        to: detail.answers?.contact_email,
      }
      const API = (APIBase || '')
      await axios.post(`${API}/privacy/send_email`, payload)
      showToast('Email sent', 'success')
      try {
        const API = (APIBase || '')
        const sentPayload = {
          submission_id: detail.submission_id,
          form_id: formId,
          selected_modules: selectedList,
          selected_level: levelSel || (detail.score?.level || ''),
          status: 'sent',
          override_reason: overrideReason,
          per_change_notes: perChangeNotes,
        }
        await axios.post(`${API}/privacy/save_review`, sentPayload)
        const met = await axios.get(`${API}/privacy/metrics`, { params: { window: 10 } })
        setMetrics(met.data)
      } catch { }
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setBusyPublish(false) }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="heading flex-1">Privacy - Assessments</h1>
        <button className="px-3 py-1.5 rounded bg-slate-200 text-sm" disabled={refreshing} onClick={refresh}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {metrics && (
        <div className="card p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Privacy Dashboard</div>
              <div className="text-xs text-gray-500">Live assessments summary · {items.length || 0} items</div>
            </div>
            <div className="flex gap-2">
              <div className="badge bg-petrol/10 text-petrol">
                Overall {metrics.accuracy_overall != null ? Math.round(metrics.accuracy_overall*100) + '%' : '-'}
              </div>
              <div className="badge bg-petrol/10 text-petrol">
                Last {metrics.window || 10}: {metrics.accuracy_lastN != null ? Math.round(metrics.accuracy_lastN*100) + '%' : '-'}
              </div>
            </div>
          </div>
        </div>
      )}
      {error && <div className="bg-red-50 text-red-700 p-2 rounded">{error}</div>}
      {loading && <div>Loading…</div>}
      {toast && <div className={`p-2 rounded text-sm ${toast.type==='success' ? 'bg-green-50 text-green-700' : toast.type==='warn' ? 'bg-yellow-50 text-yellow-700' : toast.type==='error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{toast.text}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-1">
          {(items || []).map(it => (
            <div key={it.submission_id} className="card cursor-pointer" onClick={() => openCard(it.submission_id)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-offblack">{it.contact_name || it.business_name || it.contact_email}</div>
                  <div className="text-sm text-gray-500">{it.contact_email} · {it.contact_phone}</div>
                </div>
                <div className="text-right">
                  <div className="badge">{levelLabel(it.level)}</div>
                  <div className="text-xs text-gray-500">{new Date(it.submitted_at).toLocaleString('he-IL')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="md:col-span-2">
          {openId && detail && (
            <div className="card space-y-3">
              <div className="subheading">פרטי פנייה</div>
              <div className="text-sm text-gray-600">{detail.answers?.contact_name} · {detail.answers?.business_name} · {detail.answers?.contact_email} · {detail.answers?.contact_phone}</div>
              <div className="badge">{levelLabel(detail.score?.level)}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>ID: {detail.submission_id}</div>
                <div>Submitted: {new Date(detail.submitted_at).toLocaleString('he-IL')}</div>
              </div>

              {/* Answers overview */}
              <div className="mt-2">
                <div className="font-semibold mb-1">תוצאות השאלון</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    {[
                      'owners','access','ethics','ppl','sensitive_people','sensitive_types'
                    ].map(k => (
                      (detail.answers?.[k] !== undefined && detail.answers?.[k] !== null) && (
                        <div key={k} className="flex items-start justify-between gap-3">
                          <div className="text-gray-600">{labels[k] || k}</div>
                          <div className="text-right">{fmtVal(detail.answers[k])}</div>
                        </div>
                      )
                    ))}
                  </div>
                  <div className="space-y-1">
                    {[
                      'biometric_100k','transfer','directmail_biz','directmail_self','monitor_1000','processor','processor_large_org','employees_exposed','cameras'
                    ].map(k => (
                      (detail.answers?.[k] !== undefined && detail.answers?.[k] !== null) && (
                        <div key={k} className="flex items-start justify-between gap-3">
                          <div className="text-gray-600">{labels[k] || k}</div>
                          <div className="text-right">{fmtVal(detail.answers[k])}</div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Level + Components side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-2">
                  <div className="font-semibold mb-1">בחירת רמת אבטחה</div>
                  <label className="flex items-center gap-2 mb-1"><input type="radio" name="levelSel" checked={(levelSel||'')==='lone'} onChange={()=>setLevelSel('lone')} /> יחיד</label>
                  <label className="flex items-center gap-2 mb-1"><input type="radio" name="levelSel" checked={(levelSel||'')==='basic'} onChange={()=>setLevelSel('basic')} /> בסיסית</label>
                  <label className="flex items-center gap-2 mb-1"><input type="radio" name="levelSel" checked={(levelSel||'')==='mid'} onChange={()=>setLevelSel('mid')} /> בינונית</label>
                  <label className="flex items-center gap-2"><input type="radio" name="levelSel" checked={(levelSel||'')==='high'} onChange={()=>setLevelSel('high')} /> גבוהה</label>
                </div>
                <div>
                  <div className="subheading mt-2 md:mt-0">רכיבים</div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!!selectedModules.DPO} onChange={() => toggle('DPO')} /> DPO</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!!selectedModules.Registration} onChange={() => toggle('Registration')} /> רישום</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!!selectedModules.Report} onChange={() => toggle('Report')} /> דו"ח/PIA</label>
                    <hr className="my-2" />
                    {['worker_security_agreement','cameras_policy','consultation_call','outsourcing_text','direct_marketing_rules'].map(k => (
                      <label key={k} className="flex items-center gap-2">
                        <input type="checkbox" checked={!!selectedModules[k]} onChange={() => toggle(k)} /> {reqMap[k] || k}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className="font-semibold">הערת שינוי (אופציונלי)</div>
                <textarea className="w-full p-2 rounded border" rows={3} value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} placeholder="נסחו מדוע בוצע שינוי ביחס להצעה" />
              </div>

              <div className="flex gap-2 pt-2">
                <button className="px-3 py-1.5 rounded bg-petrol text-white disabled:opacity-60" disabled={busySend||busyPublish||busySave} onClick={previewEmail}>Preview Email</button>
                <button className="px-3 py-1.5 rounded bg-petrol text-white disabled:opacity-60" disabled={busySend||busyPublish} onClick={sendEmail}>{busySend ? 'Sending…' : 'Send Email'}</button>
                <button className="px-3 py-1.5 rounded bg-petrol/80 text-white disabled:opacity-60" disabled={busyPublish||busySend} onClick={approvePublish}>{busyPublish ? 'Publishing…' : 'Approve & Publish'}</button>
                <button className="px-3 py-1.5 rounded bg-petrol/80 text-white disabled:opacity-60" disabled={busySave||busySend||busyPublish} onClick={saveReview}>{busySave ? 'Saving…' : 'Save Review'}</button>
                <button className="px-3 py-1.5 rounded bg-gray-200" onClick={() => setOpenId(null)}>Close</button>
              </div>
              {showEmail && (
                <div className="mt-3 p-3 bg-cardGrey rounded">
                  <div className="font-semibold">נושא:</div>
                  <div className="text-sm mb-2">{emailPreview.subject}</div>
                  <div className="font-semibold">תוכן:</div>
                  <pre className="whitespace-pre-wrap text-sm">{emailPreview.body}</pre>
                </div>
              )}
              {publishInfo && (
                <div className="mt-3 p-3 bg-white border rounded space-y-1">
                  <div className="font-semibold">Links</div>
                  <div className="text-sm break-all">Report: <a className="text-petrol underline" href={publishInfo.report_url} target="_blank" rel="noreferrer">{publishInfo.report_url}</a></div>
                  <div className="text-sm break-all">Short: <a className="text-petrol underline" href={publishInfo.share_url} target="_blank" rel="noreferrer">{publishInfo.share_url}</a></div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded bg-slate-200" onClick={()=>copyText(publishInfo.report_url)}>Copy Report</button>
                    <button className="px-3 py-1 rounded bg-slate-200" onClick={()=>copyText(publishInfo.share_url)}>Copy Short</button>
                    <button className="px-3 py-1 rounded bg-slate-200" onClick={copyWhatsAppLink}>Copy WhatsApp</button>
                  </div>
                </div>
              )}

            </div>
          )}
          {!openId && (
            <div className="card text-sm text-gray-600 flex items-center justify-between">
              <div>Select an assessment to review details, publish, or send the client email.</div>
              <div className="text-xs text-gray-500">Auto-opening the latest item when available.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


















