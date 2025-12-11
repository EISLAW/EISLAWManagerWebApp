import React from 'react'

const SectionCard = React.forwardRef(function SectionCard({ title, subtitle, helper, children, footer, testId }, ref) {
  return (
    <section ref={ref} className="card space-y-4" data-testid={testId}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-petrol">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        {helper && <p className="text-xs text-slate-500">{helper}</p>}
      </header>
      {children}
      {footer && <footer className="pt-2 border-t border-slate-200">{footer}</footer>}
    </section>
  )
})

export default SectionCard
