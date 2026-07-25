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
      {currentStatus === 'active' && (
        <button
          onClick={() => setStatus('draft')}
          disabled={!!loading}
          className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 disabled:opacity-50"
        >
          {loading === 'draft' ? '…' : 'Unpublish'}
        </button>
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
