'use client'

import { useState } from 'react'

export default function NudgeWaiverButton({ count }: { count: number }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null)
  const [confirm, setConfirm] = useState(false)

  if (count === 0) return null

  async function send() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/jjwl/admin/nudge-waiver', { method: 'POST' })
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
        ✓ Waiver reminder sent to {result.sent} member{result.sent !== 1 ? 's' : ''}.
      </p>
    )
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-600">
          Send waiver reminder to <strong>{count}</strong> active member{count !== 1 ? 's' : ''} missing a waiver?
        </p>
        <button
          onClick={send}
          disabled={loading}
          className="text-sm px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
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
      className="text-sm px-3 py-1.5 border border-orange-400 text-orange-700 rounded-lg hover:bg-orange-50"
    >
      Nudge waiver ({count})
    </button>
  )
}
