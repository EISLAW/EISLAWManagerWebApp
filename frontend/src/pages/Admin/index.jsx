import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOwners, upsertOwner, removeOwner } from '../../lib/owners'
import { Sparkles, FileText, Users, Settings, ChevronRight, Target } from 'lucide-react'

export default function Admin(){
  const [owners, setOwners] = useState(listOwners())
  const [form, setForm] = useState({ name:'', email:'' })
  const [showOwners, setShowOwners] = useState(false)
  function refresh(){ setOwners(listOwners()) }
  function add(){ if(!form.name.trim()||!form.email.trim()) return; upsertOwner({ name:form.name.trim(), email:form.email.trim(), active:true }); setForm({name:'', email:''}); refresh() }
  function del(id){ removeOwner(id); refresh() }

  const templateCards = [
    {
      to: '/settings/prompts',
      icon: Sparkles,
      title: 'תבניות פרומפטים',
      titleEn: 'Prompt Templates',
      description: 'נהל תבניות AI לתוכן שיווקי ועוזר חכם',
      color: 'petrol'
    },
    {
      to: '/settings/leads',
      icon: Target,
      title: 'ניקוד לידים',
      titleEn: 'Lead Scoring',
      description: 'הגדר כללי ניקוד לתעדוף לידים אוטומטי',
      color: 'emerald'
    },
    {
      to: '/settings/quotes',
      icon: FileText,
      title: 'תבניות הצעות מחיר',
      titleEn: 'Quote Templates',
      description: 'נהל תבניות להצעות מחיר ומסמכים',
      color: 'copper',
      comingSoon: true
    }
  ]

  return (
    <div className="space-y-6">
      <h1 className="heading flex items-center gap-2">
        <Settings className="w-6 h-6 text-petrol" />
        הגדרות
      </h1>

      {/* Template Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templateCards.map(card => (
          <Link
            key={card.to}
            to={card.comingSoon ? '#' : card.to}
            className={`card hover:shadow-md transition-shadow group ${card.comingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={e => card.comingSoon && e.preventDefault()}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg bg-${card.color}/10`}>
                <card.icon className={`w-6 h-6 text-${card.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{card.title}</h3>
                  {card.comingSoon && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">בקרוב</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{card.description}</p>
              </div>
              {!card.comingSoon && (
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-petrol transition-colors" />
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Integrations Status */}
      <div className="card">
        <div className="subheading mb-2 flex items-center gap-2">
          <span>אינטגרציות</span>
          
        </div>
        <p className="text-sm text-slate-600">מצב אינטגרציות יופיע כאן. לבדיקות מקומיות, השתמש ב-tools/.</p>
      </div>

      {/* Owners Section (Collapsible) */}
      <div className="card">
        <button
          onClick={() => setShowOwners(!showOwners)}
          className="w-full flex items-center justify-between"
        >
          <div className="subheading flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>בעלים</span>
            
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showOwners ? 'rotate-90' : ''}`} />
        </button>

        {showOwners && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2 items-end mb-4">
              <label className="text-sm">
                Name
                <input className="mt-1 block border rounded px-2 py-1" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
              </label>
              <label className="text-sm">
                Email
                <input className="mt-1 block border rounded px-2 py-1" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
              </label>
              <button className="px-3 py-2 rounded bg-petrol text-white" onClick={add}>Add</button>
            </div>
            <div className="divide-y">
              {owners.length===0 && <div className="text-sm text-slate-600">No owners yet.</div>}
              {owners.map(o => (
                <div key={o.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-slate-500">{o.email}</div>
                  </div>
                  <button className="text-xs underline text-copper" onClick={()=>del(o.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
