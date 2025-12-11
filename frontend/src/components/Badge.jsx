import React from 'react'

export default function Badge({ children, variant='primary' }){
  const cls = {
    primary: 'bg-petrol text-white',
    neutral: 'bg-slate-200 text-slate-800',
    success: 'bg-green-600 text-white',
    warn: 'bg-amber-500 text-black',
    error: 'bg-red-600 text-white'
  }[variant] || 'bg-petrol text-white'
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${cls}`}>{children}</span>
}

