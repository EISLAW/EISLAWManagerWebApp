import React from 'react'

export default function Table({ columns, rows }){
  return (
    <div className="card overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-right text-slate-600">
            {columns.map(col => <th key={col.key} className="p-2">{col.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i} className="border-b last:border-none">
              {columns.map(col => <td key={col.key} className="p-2">{col.render? col.render(r[col.key], r) : r[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

