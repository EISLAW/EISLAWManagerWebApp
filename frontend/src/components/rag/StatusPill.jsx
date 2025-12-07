import React from 'react'

function StatusPill({ tone = 'info', children, testId }) {
  const toneMap = {
    info: 'bg-blue-50 text-blue-700 border border-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${toneMap[tone]}`}
      data-testid={testId}
    >
      {children}
    </span>
  )
}

export default StatusPill
