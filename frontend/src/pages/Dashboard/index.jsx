import React, { useEffect, useMemo, useState } from 'react'
import KpiCard from '../../components/KpiCard.jsx'
import WorkQueue from '../../components/WorkQueue.jsx'
import DashboardSearch from '../../components/DashboardSearch.jsx'
import DashboardEmails from '../../components/DashboardEmails.jsx'
import DashboardClientPicker from '../../components/DashboardClientPicker.jsx'
import TaskBoard from '../../features/tasksNew/TaskBoard.jsx'

const FILTER_KEY = 'eislaw.ui.dashboard.filters.v1'

export default function Dashboard(){
  const [filters, setFilters] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem(FILTER_KEY)) || { time: 7, client: '', owner: 'all', mode: 'auto' } }catch{ return { time:7, client:'', owner:'all', mode:'auto' } }
  })
  const [apiBase, setApiBase] = useState('')
  const [kpis, setKpis] = useState({ active: '-', pending: '-', ready: '-', projects: '-', health: { airtable:null, graph:null, sp:null } })

  useEffect(() => { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)) }, [filters])

  useEffect(() => {
    ;(async()=>{
      // Pick API base like other pages do
      const ENV_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const MODE = (import.meta.env.VITE_MODE || '').toUpperCase()
      const bases = []
      if(MODE === 'LOCAL' && ENV_API) bases.push(ENV_API)
      if(ENV_API) bases.push(ENV_API)
      bases.push('http://127.0.0.1:8788', 'http://localhost:8788', 'https://eislaw-api-01.azurewebsites.net')
      for (const b of bases){ try{ const r = await fetch(`${b}/health`); if(r.ok){ setApiBase(b); break } }catch{} }
    })()
  }, [])

  useEffect(() => {
    ;(async()=>{
      if(!apiBase) return
      try{
        const [clientsRes, healthGraph, healthSp] = await Promise.all([
          fetch(`${apiBase}/api/clients`).then(r=>r.ok? r.json(): []),
          fetch(`${apiBase}/graph/check`).then(r=>r.ok? r.json(): { ok:false }).catch(()=>({ ok:false })),
          fetch(`${apiBase}/sp/check`).then(r=>r.ok? r.json(): { ok:false }).catch(()=>({ ok:false })),
        ])
        setKpis(s=>({
          ...s,
          active: Array.isArray(clientsRes)? clientsRes.length : '-',
          projects: '-',
          pending: '-',
          ready: '-',
          health: { airtable: null, graph: !!healthGraph, sp: !!healthSp }
        }))
      }catch{}
    })()
  }, [apiBase, filters])

  function openClientCard(name){
    try{ window.location.assign(`/clients/${encodeURIComponent(name)}`) }catch{}
  }

  const primaryActions = [
    { label: 'Add Client', handler: () => window.location.assign('/clients?create=1') },
    { label: 'Add Task', handler: () => window.location.assign('/clients?tab=tasks') },
    { label: 'Sync Registry', handler: () => window.location.assign('/clients') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="heading">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <label className="text-sm">Time
            <select className="ml-1 border rounded px-2 py-1 text-sm" value={String(filters.time)} onChange={e=>setFilters({...filters, time: parseInt(e.target.value,10)})}>
              <option value="7">7</option>
              <option value="30">30</option>
            </select>
          </label>
          <DashboardClientPicker
            apiBase={apiBase}
            value={filters.client}
            onChange={(val)=>setFilters({...filters, client: val})}
          />
          <label className="text-sm">Owner
            <select className="ml-1 border rounded px-2 py-1 text-sm" value={filters.owner} onChange={e=>setFilters({...filters, owner: e.target.value})}>
              <option value="all">All</option>
              <option value="me">Me</option>
              <option value="delegated">Delegated</option>
            </select>
          </label>
          <label className="text-sm">Mode
            <select className="ml-1 border rounded px-2 py-1 text-sm" value={filters.mode} onChange={e=>setFilters({...filters, mode: e.target.value})}>
              <option value="auto">Auto</option>
              <option value="local">Local</option>
              <option value="cloud">Cloud</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2">
          {primaryActions.map((action) => (
            <button
              key={action.label}
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-petrol shadow-sm hover:bg-petrol hover:text-white transition min-h-[44px] inline-flex items-center"
              onClick={action.handler}
            >
              {action.label}
            </button>
          ))}
        </div>
        <div className="inline-flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${kpis.health.sp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            SharePoint: {kpis.health.sp ? 'Connected' : 'Offline'}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${kpis.health.graph ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            Graph: {kpis.health.graph ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Active Clients" value={kpis.active} onClick={()=>window.location.assign('/clients')} />
        <KpiCard label="Pending Reviews" value={kpis.pending} onClick={()=>window.location.assign('/privacy')} />
        <KpiCard label="Ready To Send" value={kpis.ready} onClick={()=>window.location.assign('/privacy')} />
        <KpiCard label="Open Projects" value={kpis.projects} onClick={()=>window.location.assign('/projects')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <DashboardSearch onSelectClient={(name)=>setFilters({...filters, client: name})} onCreateClient={(nm)=>window.location.assign(`/clients?create=${encodeURIComponent(nm)}`)} />
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="subheading">My Tasks</div>
              <div className="flex items-center gap-2 text-xs">
                <button className="text-petrol underline min-h-[44px] px-2 inline-flex items-center" onClick={()=>window.location.assign('/clients?tab=tasks')}>Open Task Board</button>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {filters.client
                ? 'Showing tasks for selected client.'
                : 'Showing open tasks for all clients. Use the filter to narrow down if needed.'}
            </div>
            <TaskBoard
              clientName={filters.client || null}
              showClientBadge
              allowGlobalCreate
            />
          </div>
        </div>
        <div className="space-y-4">
          <DashboardEmails apiBase={apiBase} clientFilter={filters.client} />
        </div>
      </div>
    </div>
  )
}
