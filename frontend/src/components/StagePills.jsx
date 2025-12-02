import React from 'react'
import Badge from './Badge.jsx'

export default function StagePills({ phase }){
  const stages = ['consultation','analysis','quote','production','delivery','closed','retainer']
  return (
    <div className="flex flex-wrap gap-2">
      {stages.map(s => (
        <Badge key={s} variant={s===phase? 'primary':'neutral'}>{s}</Badge>
      ))}
    </div>
  )
}

