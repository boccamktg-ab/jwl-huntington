'use client'

import { useState, useEffect } from 'react'

type Position = {
  id: string
  label: string
  allows_detail: boolean
  sort_order: number
  is_active: boolean
}

export default function MemberPositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newAllowsDetail, setNewAllowsDetail] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/member-positions')
    const { positions } = await res.json()
    setPositions(positions)
  }

  useEffect(() => { load() }, [])

  async function addPosition() {
    if (!newLabel.trim()) return
    setAdding(true)
    setError('')
    const res = await fetch('/api/admin/member-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel, allows_detail: newAllowsDetail }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setAdding(false); return }
    setNewLabel('')
    setNewAllowsDetail(false)
    setAdding(false)
    load()
  }

  async function toggle(id: string, is_active: boolean) {
    await fetch('/api/admin/member-positions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    load()
  }

  async function move(id: string, direction: 'up' | 'down') {
    const idx = positions.findIndex(p => p.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= positions.length) return

    const a = positions[idx]
    const b = positions[swapIdx]

    await Promise.all([
      fetch('/api/admin/member-positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, sort_order: b.sort_order }),
      }),
      fetch('/api/admin/member-positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, sort_order: a.sort_order }),
      }),
    ])
    load()
  }

  async function deletePosition(id: string) {
    const res = await fetch('/api/admin/member-positions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    load()
  }

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Member Positions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure the position options available in the member directory. Drag to reorder, or use the arrows.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Position</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Detail field</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {positions.map((pos, idx) => (
              <tr key={pos.id} className={pos.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-medium text-gray-900">{pos.label}</td>
                <td className="px-4 py-3 text-center">
                  {pos.allows_detail ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Yes</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(pos.id, !pos.is_active)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${pos.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {pos.is_active ? 'Active' : 'Hidden'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 items-center justify-end">
                    <button onClick={() => move(pos.id, 'up')} disabled={idx === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs px-1">↑</button>
                    <button onClick={() => move(pos.id, 'down')} disabled={idx === positions.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs px-1">↓</button>
                    <button onClick={() => deletePosition(pos.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-1 ml-1">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new position */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Add position</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Position label"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPosition()}
            className={`flex-1 ${inputCls}`}
          />
          <button
            onClick={addPosition}
            disabled={adding || !newLabel.trim()}
            className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={newAllowsDetail}
            onChange={e => setNewAllowsDetail(e.target.checked)}
            className="rounded border-gray-300 text-[#1B52C1]"
          />
          <span className="text-sm text-gray-600">Show a detail field when this position is selected</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
