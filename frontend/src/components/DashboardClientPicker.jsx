import React, { useEffect, useMemo, useState } from 'react'

export default function DashboardClientPicker({ value, onChange, apiBase }) {
  const envApi = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const targetBase = useMemo(
    () => (apiBase || envApi || '').replace(/\/$/, ''),
    [apiBase, envApi]
  )
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!targetBase) {
      setOptions([])
      return
    }
    const controller = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${targetBase}/api/clients`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed')
        const list = await res.json()
        const sorted = Array.isArray(list)
          ? [...list].sort((a, b) =>
              (a.name || '').localeCompare(b.name || '', undefined, {
                sensitivity: 'base',
              })
            )
          : []
        setOptions(sorted)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setOptions([])
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [targetBase])

  return (
    <div className="flex items-end gap-2">
      <label className="text-sm">
        Client
        <select
          className="ml-1 border rounded px-2 py-1 text-sm min-w-[200px]"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value || '')}
          disabled={loading && options.length === 0}
        >
          <option value="">All clients</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.name || ''}>
              {opt.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="text-xs text-petrol underline disabled:text-slate-400 min-h-[44px] px-2 inline-flex items-center"
        disabled={!value}
        onClick={() =>
          value && window.location.assign(`/clients/${encodeURIComponent(value)}`)
        }
      >
        Open client
      </button>
      <button
        type="button"
        className="text-xs text-slate-500 underline min-h-[44px] px-2 inline-flex items-center"
        disabled={!value && !loading}
        onClick={() => onChange?.('')}
      >
        Clear
      </button>
    </div>
  )
}
