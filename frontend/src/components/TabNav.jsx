import React from 'react'
import { Link } from 'react-router-dom'

export default function TabNav({ base, tabs, current }){
  return (
    <div className="flex flex-wrap gap-2 border-b pb-2">
      {tabs.map(t => (
        <Link key={t.key} to={`${base}?tab=${t.key}`} className={`px-3 py-1 rounded-full text-sm ${current===t.key? 'bg-petrol text-white':'bg-slate-200 text-slate-800'}`}>{t.label}</Link>
      ))}
    </div>
  )
}

