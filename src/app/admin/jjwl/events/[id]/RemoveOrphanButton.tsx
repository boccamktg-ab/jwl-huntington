'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RemoveOrphanButton({ signupId }: { signupId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function remove() {
    setLoading(true)
    await fetch('/api/jjwl/admin/attendance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signup_id: signupId, action: 'remove_orphan' }),
    })
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={remove}
          disabled={loading}
          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? '…' : 'Confirm remove'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-red-500 hover:text-red-700 hover:underline"
    >
      Remove
    </button>
  )
}
