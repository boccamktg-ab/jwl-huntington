'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Member = { id: string; name: string; grade: number | null }

export default function AddAttendeePanel({
  eventId,
  availableMembers,
}: {
  eventId: string
  availableMembers: Member[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return q
      ? availableMembers.filter(m => m.name.toLowerCase().includes(q))
      : availableMembers
  }, [query, availableMembers])

  async function addMember() {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/jjwl/admin/attendance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_add', event_id: eventId, member_id: selectedId }),
    })
    setLoading(false)
    if (res.ok) {
      setSelectedId('')
      setQuery('')
      router.refresh()
    } else {
      const json = await res.json()
      setError(json.error ?? 'Something went wrong.')
    }
  }

  if (availableMembers.length === 0) {
    return (
      <p className="text-xs text-gray-400 mt-3">All active members are already on the roster.</p>
    )
  }

  return (
    <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Add member who wasn't signed up</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedId('') }}
          className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B52C1] bg-white"
        />
      </div>

      {query && (
        <div className="bg-white border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-2">No matches</p>
          ) : (
            filtered.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelectedId(m.id); setQuery(m.name) }}
                className={`w-full text-left text-sm px-3 py-2 hover:bg-blue-50 flex items-center justify-between ${
                  selectedId === m.id ? 'bg-blue-50 text-[#1B52C1]' : 'text-gray-800'
                }`}
              >
                <span>{m.name}</span>
                {m.grade && <span className="text-xs text-gray-400">Grade {m.grade}</span>}
              </button>
            ))
          )}
        </div>
      )}

      {selectedId && (
        <div className="flex items-center gap-3">
          <button
            onClick={addMember}
            disabled={loading}
            className="text-sm px-4 py-2 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1540A0] disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add to roster'}
          </button>
          <button
            onClick={() => { setSelectedId(''); setQuery('') }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
