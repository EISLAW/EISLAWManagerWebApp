import React from 'react'

export default function HealthBadge({ ok, label, onClick }){
  const cls = ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <button className={`text-xs px-2 py-0.5 rounded border ${cls}`} onClick={onClick}>
      {label}: {ok ? 'תקין' : 'בדיקה'}
    </button>
  )
}

