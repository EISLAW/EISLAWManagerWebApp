import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import RoutesRoot from './routes.jsx'
import { detectApiBase, getStoredApiBase, setStoredApiBase } from './utils/apiBase.js'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/rag', label: 'RAG' },
  { to: '/marketing', label: 'Marketing' },
  { to: '/prompts', label: 'Prompts' },
  { to: '/settings', label: 'Settings' },
  { to: '/privacy', label: 'Privacy' },
]

export default function App(){
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
  const envName = (apiBase && (apiBase.startsWith('http://127.0.0.1') || apiBase.startsWith('http://localhost'))) ? 'LOCAL' : (apiBase ? 'STAGING' : 'UNKNOWN')
  return (
    <div className="min-h-screen bg-bg text-slate-900">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-4 items-center">
          <div className="text-petrol font-semibold">EISLAW Web App</div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${envName==='LOCAL' ? 'bg-success/20 text-success' : 'bg-copper/20 text-copper'}`}>{envName}</span>
          <span className="text-xs text-slate-500">FE v{FE_VER}{FE_SHA? ` (${FE_SHA})`:''}</span>
          {health && <span className="text-xs text-slate-500">BE {health.version || ''}{health.commit? ` (${health.commit})`:''}</span>}
          <nav className="flex gap-3 text-sm">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'text-petrol' : 'text-slate-600')}>
                {label}
              </NavLink>
            ))}
          </nav>
          <button className="ml-auto text-sm text-slate-600 underline" onClick={()=>setShowAbout(v=>!v)}>About</button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
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
  )
}
