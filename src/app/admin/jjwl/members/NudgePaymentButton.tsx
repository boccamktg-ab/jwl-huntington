'use client'

import { useState } from 'react'

export default function NudgePaymentButton({ count }: { count: number }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null)
  const [confirm, setConfirm] = useState(false)

  if (count === 0) return null

  async function send() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/jjwl/admin/nudge-payment', { method: 'POST' })
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
        ✓ Payment reminder sent to {result.sent} member{result.sent !== 1 ? 's' : ''}.
      </p>
    )
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-600">
          Send payment reminder to <strong>{count}</strong> member{count !== 1 ? 's' : ''} awaiting payment?
        </p>
        <button
          onClick={send}
          disabled={loading}
          className="text-sm px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send reminder'}
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
      className="text-sm px-3 py-1.5 border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50"
    >
      Nudge payment ({count})
    </button>
  )
}
