import React from 'react'
import { Loader2, RefreshCcw } from 'lucide-react'

export default function SyncButton({ onSync, lastSyncTime, syncing, disabled }) {
  const isBusy = syncing || disabled
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onSync}
        disabled={isBusy}
        className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-petrol text-white hover:bg-petrolHover active:bg-petrolActive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
        <span>סנכרן מ-Airtable</span>
      </button>
      <div className="text-xs text-slate-600">
        עודכן: {lastSyncTime || '—'}
      </div>
    </div>
  )
}
