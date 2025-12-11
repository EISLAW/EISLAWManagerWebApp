import React from 'react'

function LabeledField({ label, helper, children }) {
  return (
    <label className="block text-right space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {helper && <span className="text-xs text-slate-500">{helper}</span>}
    </label>
  )
}

export default LabeledField
