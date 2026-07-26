'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApprovalActions({ id, name, status }: { id: string; name: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectStep, setRejectStep] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function updateStatus(newStatus: 'approved' | 'disabled', reason?: string) {
    setLoading(newStatus)
    const res = await fetch('/api/admin/social-workers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, rejection_reason: reason || undefined }),
    })
    if (!res.ok) {
      const json = await res.json()
      alert(json.error || 'Something went wrong.')
    }
    setRejectStep(false)
    setRejectReason('')
    router.refresh()
    setLoading(null)
  }

  async function deleteSocialWorker() {
    if (!confirm(`Permanently delete ${name}? Their families and grant records will be kept but unlinked. This cannot be undone.`)) return
    setLoading('delete')
    const res = await fetch('/api/admin/social-workers/status', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const json = await res.json()
      alert(json.error || 'Something went wrong.')
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex gap-2 shrink-0">
      {status === 'pending' && !rejectStep && (
        <>
          <button
            onClick={() => updateStatus('approved')}
            disabled={!!loading}
            className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading === 'approved' ? '…' : 'Approve'}
          </button>
          <button
            onClick={() => setRejectStep(true)}
            disabled={!!loading}
            className="text-sm px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
      {rejectStep && (
        <div className="flex flex-col gap-2 items-end">
          <input
            type="text"
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 w-48"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => { setRejectStep(false); setRejectReason('') }} className="text-sm text-gray-500 hover:underline">Cancel</button>
            <button
              onClick={() => updateStatus('disabled', rejectReason)}
              disabled={!!loading}
              className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading === 'disabled' ? '…' : 'Confirm reject'}
            </button>
          </div>
        </div>
      )}
      {status === 'approved' && (
        <button
          onClick={() => updateStatus('disabled')}
          disabled={!!loading}
          className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {loading === 'disabled' ? '…' : 'Disable'}
        </button>
      )}
      {status === 'disabled' && (
        <button
          onClick={() => updateStatus('approved')}
          disabled={!!loading}
          className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
        >
          {loading === 'approved' ? '…' : 'Re-enable'}
        </button>
      )}
      <button
        onClick={deleteSocialWorker}
        disabled={!!loading}
        className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        {loading === 'delete' ? '…' : 'Delete'}
      </button>
    </div>
  )
}
