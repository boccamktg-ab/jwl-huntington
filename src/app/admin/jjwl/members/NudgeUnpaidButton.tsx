'use client'

import { useState } from 'react'

export default function NudgeUnpaidButton({ count }: { count: number }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null)
  const [confirm, setConfirm] = useState(false)

  if (count === 0) return null

  async function send() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/jjwl/admin/nudge-unpaid', { method: 'POST' })
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
        ✓ Enrollment warning sent to {result.sent} member{result.sent !== 1 ? 's' : ''}.
      </p>
    )
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-600">
          Send enrollment warning to <strong>{count}</strong> unpaid member{count !== 1 ? 's' : ''} (registered 7+ days ago)?
        </p>
        <button
          onClick={send}
          disabled={loading}
          className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send warning'}
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
      className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
    >
      Unpaid warning ({count})
    </button>
  )
}
