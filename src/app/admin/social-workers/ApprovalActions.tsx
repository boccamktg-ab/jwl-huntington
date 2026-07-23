'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApprovalActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: 'approved' | 'disabled') {
    setLoading(status)
    const res = await fetch('/api/admin/social-workers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) {
      const json = await res.json()
      alert(json.error || 'Something went wrong.')
    }
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
      <button
        onClick={() => updateStatus('approved')}
        disabled={!!loading}
        className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading === 'approved' ? '…' : 'Approve'}
      </button>
      <button
        onClick={() => updateStatus('disabled')}
        disabled={!!loading}
        className="text-sm px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
      >
        {loading === 'disabled' ? '…' : 'Reject'}
      </button>
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
