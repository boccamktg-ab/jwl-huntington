'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  signupId: string
  eventId: string
  creditHours: number
  currentStatus: string
}

export default function AttendanceActions({ signupId, eventId, creditHours, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function act(action: string) {
    setLoading(action)
    const res = await fetch('/api/jjwl/admin/attendance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signup_id: signupId, event_id: eventId, action, credit_hours: creditHours }),
    })
    if (res.ok) router.refresh()
    setLoading(null)
  }

  if (currentStatus === 'confirmed_attended') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-600 font-medium">✓ Confirmed</span>
        <button onClick={() => act('no_show')} disabled={!!loading}
          className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50 disabled:opacity-50">
          {loading === 'no_show' ? '…' : 'Undo'}
        </button>
      </div>
    )
  }

  if (currentStatus === 'no_show') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-500">No-show</span>
        <button onClick={() => act('confirm')} disabled={!!loading}
          className="text-xs px-2 py-1 border border-green-200 text-green-700 rounded hover:bg-green-50 disabled:opacity-50">
          {loading === 'confirm' ? '…' : 'Undo'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      <button onClick={() => act('confirm')} disabled={!!loading}
        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50">
        {loading === 'confirm' ? '…' : 'Attended'}
      </button>
      <button onClick={() => act('no_show')} disabled={!!loading}
        className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50">
        {loading === 'no_show' ? '…' : 'No-show'}
      </button>
    </div>
  )
}
