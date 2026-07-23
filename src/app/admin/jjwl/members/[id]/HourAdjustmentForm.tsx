'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HourAdjustmentForm({ memberId }: { memberId: string }) {
  const router = useRouter()
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!delta || !reason.trim()) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/jjwl/admin/hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, delta: parseFloat(delta), reason: reason.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
    } else {
      setDelta('')
      setReason('')
      router.refresh()
    }
    setLoading(false)
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <div className="w-32">
          <label className="block text-xs text-gray-500 mb-1">Hours (+/−)</label>
          <input
            type="number" step="0.5" required
            value={delta} onChange={e => setDelta(e.target.value)}
            placeholder="e.g. 1.5 or -1"
            className={inputCls + ' w-full'}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Reason (required)</label>
          <input
            type="text" required
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for adjustment…"
            className={inputCls + ' w-full'}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading || !delta || !reason.trim()}
        className="text-sm px-4 py-2 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1540A0] disabled:opacity-50">
        {loading ? 'Saving…' : 'Apply Adjustment'}
      </button>
    </form>
  )
}
