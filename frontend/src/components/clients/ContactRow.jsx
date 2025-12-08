import React from 'react'
import { CheckCircle2, UserRound } from 'lucide-react'

function statusTone(contact) {
  if (contact.activated) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (contact.stage) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function statusLabel(contact) {
  if (contact.activated) return 'מופעל'
  if (contact.stage) return contact.stage
  return 'ליד'
}

export default function ContactRow({ contact, onActivate, onView, activating }) {
  const types = Array.isArray(contact.types) ? contact.types : []
  return (
    <tr className="border-b last:border-none hover:bg-slate-50">
      <td className="p-3 text-right">
        <div className="flex items-center gap-2 text-petrol font-semibold">
          {contact.activated && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {!contact.activated && <UserRound className="w-5 h-5 text-slate-400 shrink-0" />}
          <span>{contact.name || 'ללא שם'}</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {contact.email && (
            <span className="block truncate max-w-[220px]" dir="ltr">
              {contact.email}
            </span>
          )}
          {types.length > 0 && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {types.slice(0, 2).join(', ')}
              {types.length > 2 ? ` +${types.length - 2}` : ''}
            </span>
          )}
        </div>
      </td>
      <td className="p-3 text-right">
        <div className="text-sm text-slate-800" dir="ltr">{contact.phone || '—'}</div>
      </td>
      <td className="p-3 text-right">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${statusTone(contact)}`}>
          {statusLabel(contact)}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center justify-start md:justify-end gap-2">
          {contact.activated ? (
            <button
              type="button"
              className="px-3 py-2 min-w-[120px] min-h-[44px] rounded-lg border border-slate-200 text-sm text-petrol hover:bg-slate-50"
              onClick={onView}
            >
              צפה בלקוח
            </button>
          ) : (
            <button
              type="button"
              className="px-3 py-2 min-w-[120px] min-h-[44px] rounded-lg bg-white border border-slate-200 text-sm text-petrol hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onActivate}
              disabled={activating}
            >
              {activating ? 'פותח...' : 'פתח תיקייה'}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
