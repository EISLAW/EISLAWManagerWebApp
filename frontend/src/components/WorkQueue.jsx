import React from 'react'

export default function WorkQueue({ title, items, renderItem, emptyText }){
  return (
    <div className="card">
      <div className="subheading mb-2">{title}</div>
      {(!items || items.length === 0) && (
        <div className="text-sm text-slate-600">{emptyText || 'Nothing here.'}</div>
      )}
      <div className="divide-y">
        {(items || []).map((it, idx) => (
          <div key={it.id || idx} className="py-2">{renderItem ? renderItem(it) : JSON.stringify(it)}</div>
        ))}
      </div>
    </div>
  )}

