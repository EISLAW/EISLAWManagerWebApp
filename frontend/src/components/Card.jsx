import React from 'react'

export default function Card({ title, children, className='' }){
  return (
    <div className={`card ${className}`}>
      {title && <div className="subheading mb-3">{title}</div>}
      {children}
    </div>
  )
}

