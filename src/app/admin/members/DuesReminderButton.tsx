'use client'

import { useState } from 'react'

export default function DuesReminderButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<{ sent: number; total_overdue: number } | null>(null)

  async function send() {
    if (!confirm('Send dues reminder emails to all overdue members?')) return
    setState('loading')
    const res = await fetch('/api/admin/members/dues-reminder', { method: 'POST' })
    const json = await res.json()
    setResult(json)
    setState('done')
  }

  if (state === 'done' && result) {
    return (
      <span className="text-sm text-green-700 font-medium">
        ✓ Sent to {result.sent} member{result.sent !== 1 ? 's' : ''} ({result.total_overdue} overdue)
      </span>
    )
  }

  return (
    <button onClick={send} disabled={state === 'loading'}
      className="text-sm border border-amber-400 text-amber-700 rounded-lg px-3 py-1.5 hover:bg-amber-50 disabled:opacity-50">
      {state === 'loading' ? 'Sending…' : 'Send dues reminders'}
    </button>
  )
}
