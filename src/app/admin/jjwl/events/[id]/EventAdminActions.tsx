'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  eventId: string
  currentStatus: string
}

export default function EventAdminActions({ eventId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function setStatus(status: string) {
    setLoading(status)
    await fetch('/api/jjwl/admin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, status }),
    })
    setLoading(null)
    router.refresh()
  }

  async function nudge() {
    if (!confirm('Send the event email to all active members who haven\'t signed up yet?')) return
    setLoading('nudge')
    const res = await fetch('/api/jjwl/admin/events/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    const json = await res.json()
    setLoading(null)
    alert(res.ok ? `Sent to ${json.sent} member${json.sent !== 1 ? 's' : ''}.` : `Error: ${json.error}`)
  }

  async function deleteEvent() {
    setLoading('delete')
    const res = await fetch('/api/jjwl/admin/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    if (res.ok) {
      router.push('/admin/jjwl/events')
    } else {
      const { error } = await res.json()
      alert(`Error: ${error}`)
      setLoading(null)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {currentStatus === 'draft' && (
        <button
          onClick={() => setStatus('active')}
          disabled={!!loading}
          className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'active' ? '…' : 'Publish'}
        </button>
      )}
      {currentStatus === 'sunset' && (
        <button
          onClick={() => {
            if (!confirm('Reopen this event? Any confirmed attendance marks will be reset to "signed up" so you can re-review.')) return
            setStatus('active')
          }}
          disabled={!!loading}
          className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 disabled:opacity-50"
        >
          {loading === 'active' ? '…' : 'Reopen event'}
        </button>
      )}
      {currentStatus === 'active' && (
        <>
          <button
            onClick={nudge}
            disabled={!!loading}
            className="text-sm px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
          >
            {loading === 'nudge' ? 'Sending…' : 'Nudge non-signups'}
          </button>
          <button
            onClick={() => {
              if (!confirm('Close this event and start the attendance review? Members will no longer be able to sign up.')) return
              setStatus('sunset')
            }}
            disabled={!!loading}
            className="text-sm px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
          >
            {loading === 'sunset' ? '…' : 'Close event'}
          </button>
          <button
            onClick={() => setStatus('draft')}
            disabled={!!loading}
            className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 disabled:opacity-50"
          >
            {loading === 'draft' ? '…' : 'Unpublish'}
          </button>
        </>
      )}

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:border-red-400"
        >
          Delete
        </button>
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Delete this event?</span>
          <button
            onClick={deleteEvent}
            disabled={loading === 'delete'}
            className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
          >
            {loading === 'delete' ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </span>
      )}
    </div>
  )
}
