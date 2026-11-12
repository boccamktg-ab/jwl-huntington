'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SchoolCodeEdit({ schoolId, code }: { schoolId: string; code: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(code ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await fetch('/api/admin/setup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, code: value.trim().toUpperCase() }),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          maxLength={8}
          placeholder="e.g. SPS"
          className="w-20 border border-blue-300 rounded px-2 py-0.5 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button onClick={handleSave} disabled={loading}
          className="text-xs text-white bg-blue-600 hover:bg-blue-700 rounded px-2 py-0.5 disabled:opacity-50">
          {loading ? '…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-xs font-mono rounded px-1.5 py-0.5 border ${
        code
          ? 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100'
          : 'text-gray-400 border-dashed border-gray-300 hover:border-gray-400'
      }`}
      title="Click to edit school code"
    >
      {code ?? 'add code'}
    </button>
  )
}
