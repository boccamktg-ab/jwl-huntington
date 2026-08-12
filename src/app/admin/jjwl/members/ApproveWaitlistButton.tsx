'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApproveWaitlistButton({ memberId }: { memberId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function approve() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/jjwl/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, action: 'approve_waitlist' }),
    })
    const data = await res.json()
    if (!data.ok) setError(data.error ?? 'Error')
    else router.refresh()
    setLoading(false)
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={approve}
        disabled={loading}
        className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? '…' : 'Approve off waitlist'}
      </button>
      {error && <p className="text-xs text-red-500 max-w-[160px]">{error}</p>}
    </div>
  )
}
