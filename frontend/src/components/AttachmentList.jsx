import React from 'react'

const ICONS = {
  folder: '📁', file: '📄', email: '✉️', link: '🔗', doc: '📃'
}

export default function AttachmentList({ items }){
  if (!items || items.length === 0) return <div className="text-sm text-slate-500">No attachments</div>
  return (
    <div className="divide-y">
      {items.map((a, idx) => (
        <div key={idx} className="py-1 flex items-center justify-between">
          <div className="text-sm"><span className="mr-2">{ICONS[a.type] || '•'}</span>{a.label || a.url || a.path || a.messageId}</div>
          {(a.openUrl || a.url) && <a className="text-petrol underline text-sm" href={a.openUrl || a.url} target="_blank" rel="noreferrer">Open</a>}
        </div>
      ))}
    </div>
  )
}

