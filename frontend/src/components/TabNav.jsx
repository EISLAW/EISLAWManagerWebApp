import React from 'react'
import { Link } from 'react-router-dom'

export default function TabNav({ base, tabs, current }){
  return (
    <nav role="tablist" className="flex flex-wrap gap-2 border-b pb-2" aria-label="Client tabs">
      {tabs.map(t => (
        <Link
          key={t.key}
          role="tab"
          aria-selected={current === t.key}
          data-testid={`tab-${t.key}`}
          to={`${base}?tab=${t.key}`}
          className={`px-3 py-1 rounded-full text-sm ${current===t.key? 'bg-petrol text-white':'bg-slate-200 text-slate-800 hover:bg-slate-300'} transition-colors`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
