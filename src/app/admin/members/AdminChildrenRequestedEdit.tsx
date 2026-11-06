'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminChildrenRequestedEdit({
  memberId,
  current,
  assigned,
}: {
  memberId: string
  current: number | null
  assigned: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(current?.toString() ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch(`/api/admin/members/${memberId}/children-requested`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childrenRequested: value !== '' ? Number(value) : null }),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className={current != null ? 'text-gray-700 font-medium' : 'text-gray-300'}>
          {current != null ? `${assigned}/${current}` : `${assigned}/—`}
        </span>
        <button onClick={() => setEditing(true)} className="text-blue-500 hover:text-blue-700 ml-1" title="Override requested count">
          ✎
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={200}
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus
        placeholder="—"
        className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button type="submit" disabled={loading}
        className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-1.5 py-0.5 rounded disabled:opacity-50">
        {loading ? '…' : '✓'}
      </button>
      <button type="button" onClick={() => { setEditing(false); setValue(current?.toString() ?? '') }}
        className="text-xs text-gray-400 hover:text-gray-600">✕</button>
    </form>
  )
}
