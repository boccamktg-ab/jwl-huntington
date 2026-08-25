'use client'

import { useState } from 'react'

export default function NotifyCancelledButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null)
  const [confirm, setConfirm] = useState(false)

  async function send() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/jjwl/admin/notify-cancelled', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setResult({ sent: data.sent })
        setConfirm(false)
      } else {
        setResult({ error: data.error ?? 'Something went wrong.' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (result?.sent !== undefined) {
    return (
      <p className="text-sm text-green-700">
        ✓ Signup fix notice sent to {result.sent} member{result.sent !== 1 ? 's' : ''}.
      </p>
    )
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-gray-600">
          Notify all members with a cancelled signup on a future event?
        </p>
        <button
          onClick={send}
          disabled={loading}
          className="text-sm px-3 py-1.5 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1540a0] disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send notice'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-sm text-gray-400 hover:text-gray-600">
          Cancel
        </button>
        {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-sm px-3 py-1.5 border border-[#1B52C1] text-[#1B52C1] rounded-lg hover:bg-blue-50"
    >
      Notify cancelled members
    </button>
  )
}
