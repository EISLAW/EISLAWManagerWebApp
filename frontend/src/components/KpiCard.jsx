import React from 'react'

export default function KpiCard({ label, value, subtext, onClick }){
  return (
    <button className="card text-left w-full" onClick={onClick}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value ?? '-'}</div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </button>
  )
}

