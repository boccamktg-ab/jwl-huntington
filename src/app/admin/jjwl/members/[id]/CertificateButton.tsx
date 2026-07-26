'use client'

import { useState } from 'react'

const CURRENT_SEASON = '2026-2027'

export default function CertificateButton({ memberId }: { memberId: string }) {
  const [state, setStateVal] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [hours, setHours] = useState<number | null>(null)

  async function send() {
    setStateVal('loading')
    const res = await fetch('/api/jjwl/admin/certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, season: CURRENT_SEASON }),
    })
    const json = await res.json()
    if (res.ok) {
      setHours(json.totalHours)
      setStateVal('done')
    } else {
      setStateVal('error')
    }
  }

  if (state === 'done') return (
    <p className="text-sm text-green-700">
      Certificate email sent ({hours?.toFixed(1)} hrs for {CURRENT_SEASON})
    </p>
  )
  if (state === 'error') return <p className="text-sm text-red-600">Send failed — try again.</p>

  return (
    <button
      onClick={send}
      disabled={state === 'loading'}
      className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 disabled:opacity-50"
    >
      {state === 'loading' ? 'Sending…' : `Send ${CURRENT_SEASON} certificate email`}
    </button>
  )
}
