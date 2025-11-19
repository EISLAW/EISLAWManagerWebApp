import React from 'react'

export default function KPI({ label, value, onClick, href, testId }){
  const base = 'card h-full'
  const content = (
    <div className="flex h-full flex-col justify-between gap-1">
      <div className="text-xs text-slate-600 leading-tight">{label}</div>
      <div className={`text-xl font-semibold leading-tight ${href || onClick ? 'text-petrol underline' : 'text-petrol'}`}>
        {value || '-'}
      </div>
    </div>
  )

  if (href) {
    return (
      <a className={`${base} cursor-pointer`} href={href} target="_blank" rel="noreferrer" data-testid={testId}>
        {content}
      </a>
    )
  }
  if (onClick) {
    return (
      <button className={`${base} text-left cursor-pointer`} onClick={onClick} data-testid={testId}>
        {content}
      </button>
    )
  }
  return (
    <div className={base} data-testid={testId}>
      {content}
    </div>
  )
}
