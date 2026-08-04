'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PostEventActions({
  eventId,
  creditHours,
  pendingCount,
}: {
  eventId: string
  creditHours: number
  pendingCount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function confirmAll() {
    if (!confirm(`Confirm all ${pendingCount} member${pendingCount !== 1 ? 's' : ''} as attended and award ${creditHours} hour${creditHours !== 1 ? 's' : ''} each?`)) return
    setLoading(true)
    const res = await fetch('/api/jjwl/admin/attendance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_all', event_id: eventId, credit_hours: creditHours }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const json = await res.json()
      alert(`Error: ${json.error}`)
    }
  }

  if (pendingCount === 0) return null

  return (
    <button
      onClick={confirmAll}
      disabled={loading}
      className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? 'Confirming…' : `Confirm all ${pendingCount} attended`}
    </button>
  )
}
