import React from 'react'

export default function Projects(){
  const cols = [
    {key:'todo', title:'Not Started'},
    {key:'doing', title:'In Progress'},
    {key:'hold', title:'On Hold'},
    {key:'done', title:'Completed'},
  ]
  return (
    <div className="space-y-4">
      <h1 className="heading">Projects</h1>
      <div className="grid md:grid-cols-4 gap-4">
        {cols.map(c => (
          <div className="card" key={c.key}>
            <div className="subheading mb-2">{c.title}</div>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>Example task</li>
              <li>—</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
