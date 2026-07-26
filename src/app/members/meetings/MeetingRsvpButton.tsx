'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MeetingRsvpButton({ meetingId, currentResponse }: { meetingId: string; currentResponse: string | null }) {
  const [response, setResponse] = useState(currentResponse)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function rsvp(r: 'yes' | 'no') {
    if (loading) return
    setLoading(true)
    await fetch(`/api/meetings/${meetingId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: r }),
    })
    setResponse(r)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => rsvp('yes')}
        disabled={loading}
        className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
          response === 'yes' ? 'bg-green-600 text-white' : 'border border-green-300 text-green-700 hover:bg-green-50'
        }`}
      >
        {response === 'yes' ? '✓ Going' : 'Going'}
      </button>
      <button
        onClick={() => rsvp('no')}
        disabled={loading}
        className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
          response === 'no' ? 'bg-gray-400 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        {response === 'no' ? "Can't go" : "Can't go"}
      </button>
    </div>
  )
}
