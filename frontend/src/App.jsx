import React from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { Routes, Route, NavLink } from 'react-router-dom'
import RoutesRoot from './routes.jsx'
import { detectApiBase, getStoredApiBase, setStoredApiBase } from './utils/apiBase.js'
import PublicReport from './pages/PublicReport/index.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/rag', label: 'RAG' },
  { to: '/marketing', label: 'Marketing' },
  { to: '/prompts', label: 'Prompts' },
  { to: '/ai-studio', label: 'AI Studio' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/reports', label: 'דוחות' },
  { to: '/settings', label: 'Settings' },
  { to: '/settings/quotes', label: 'תבניות הצעות' },
]

export default function App(){
  // Check window.location for public pages (works with any router type)
  // This allows /report/:token to work as a direct URL (not hash-based)
  const windowPath = typeof window !== 'undefined' ? window.location.pathname : ''

  // Public report page - render standalone without sidebar/layout
  if (windowPath.startsWith('/report/')) {
    const token = windowPath.replace('/report/', '')
    return <PublicReport tokenProp={token} />
  }

  const initialBase = React.useMemo(() => {
    const envBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'')
    return getStoredApiBase() || envBase
  }, [])
  const [apiBase, setApiBase] = React.useState(initialBase)
  const [health, setHealth] = React.useState(null)
  const [healthBase, setHealthBase] = React.useState(initialBase)
  const [showAbout, setShowAbout] = React.useState(false)
  const FE_VER = import.meta.env.VITE_APP_VERSION || 'dev'
  const FE_SHA = (import.meta.env.VITE_COMMIT_SHA || '').slice(0,7)
  React.useEffect(() => {
    if(apiBase){
      setStoredApiBase(apiBase)
      return
    }
    (async()=>{
      const detected = await detectApiBase([initialBase])
      if(detected){
        setApiBase(detected)
      }
    })()
  }, [apiBase, initialBase])
  React.useEffect(() => {
    (async()=>{
      const candidates = []
      if(apiBase) candidates.push(apiBase)
      candidates.push('https://eislaw-api-01.azurewebsites.net')
      for(const b of candidates){
        if(!b) continue
        try{
          const r = await fetch(`${b}/health`)
          if(r.ok){
            setHealth(await r.json())
            setHealthBase(b)
            return
          }
        }catch{}
      }
      setHealth(null)
    })()
  }, [apiBase])
  const apiHost = (() => {
    try {
      return apiBase ? new URL(apiBase).hostname : ''
    } catch {
      return ''
    }
  })()
  const envName = (() => {
    if (apiBase && (apiBase.startsWith('http://127.0.0.1') || apiBase.startsWith('http://localhost'))) return 'LOCAL'
    if (apiHost.includes('-stg') || apiHost.includes('-staging')) return 'STAGING'
    if (apiHost.includes('azurewebsites.net')) return 'PRODUCTION'
    return apiBase ? 'STAGING' : 'UNKNOWN'
  })()
  return (
    <div className="min-h-screen bg-bg text-slate-900 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-petrol/10 flex items-center justify-center text-petrol font-bold">EI</div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-800">EISLAW</div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${envName==='LOCAL' ? 'bg-success/20 text-success' : 'bg-copper/20 text-copper'}`}>{envName}</span>
          </div>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-slate-600">
          {apiBase && <div>API: <a className="underline" href={apiBase} target="_blank" rel="noreferrer">{apiBase}</a></div>}
          <div>FE v{FE_VER}{FE_SHA? ` (${FE_SHA})`:''}</div>
          {health && <div>BE {health.version || ''}{health.commit? ` (${health.commit})`:''}</div>}
          <button className="text-sm underline" onClick={()=>setShowAbout(v=>!v)}>About</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="text-sm text-slate-600">API Host: {apiHost || 'n/a'}</div>
            {health && <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">Health OK</span>}
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1">
          <Routes>
            {RoutesRoot}
          </Routes>
          {showAbout && (
            <div className="mt-6 card text-sm">
              <div className="subheading mb-2">About this Environment</div>
              <div>API Base: {apiBase || 'not set'}</div>
              <div>Health Base: {healthBase || 'n/a'}</div>
              <div>Origin: {typeof window !== 'undefined' ? window.location.origin : ''}</div>
              <div>Mode: {envName}</div>
              <div>FE: v{FE_VER}{FE_SHA? ` (${FE_SHA})`:''}</div>
              <div>BE: {(health && (health.version||''))}{(health && health.commit)? ` (${health.commit})`:''}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
