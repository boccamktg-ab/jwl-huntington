'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RequestCountForm({
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
    await fetch('/api/members/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childrenRequested: value ? Number(value) : null }),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">Children requested</p>
          {!editing ? (
            <p className="text-2xl font-bold text-gray-900">
              {current ?? <span className="text-gray-400 text-base font-normal">Not set</span>}
            </p>
          ) : (
            <form onSubmit={handleSave} className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={1}
                max={200}
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
                className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" disabled={loading}
                className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="text-sm text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </form>
          )}
        </div>

        <div className="text-right space-y-1">
          <p className="text-sm font-medium text-gray-700">Children assigned</p>
          <p className="text-2xl font-bold text-gray-900">{assigned}</p>
        </div>
      </div>

      {!editing && (
        <button onClick={() => setEditing(true)}
          className="mt-3 text-xs text-blue-600 hover:underline">
          {current ? 'Update my request' : "Set how many children I'd like"}
        </button>
      )}

      {current && assigned > 0 && assigned < current && (
        <p className="mt-2 text-xs text-amber-600">
          {current - assigned} more {current - assigned === 1 ? 'child' : 'children'} still to be assigned
        </p>
      )}
      {current && assigned >= current && (
        <p className="mt-2 text-xs text-green-600">✓ Fully assigned</p>
      )}
    </div>
  )
}
