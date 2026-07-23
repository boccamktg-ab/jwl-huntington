'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  memberId: string
  memberName: string
  currentStatus: string
  membershipPaid: boolean
}

export default function MemberAdminActions({ memberId, memberName, currentStatus, membershipPaid }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function act(action: string) {
    setLoading(action)
    setError('')
    const res = await fetch('/api/jjwl/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, action }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  async function deleteMember() {
    if (!confirm(`Permanently delete ${memberName}? Their event signups and hour records will be kept but unlinked. This cannot be undone.`)) return
    setLoading('delete')
    setError('')
    const res = await fetch('/api/jjwl/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, action: 'delete' }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(null)
    } else {
      router.push('/admin/jjwl/members')
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === 'pending_approval' && (
        <button onClick={() => act('approve')} disabled={!!loading}
          className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
          {loading === 'approve' ? '…' : 'Approve Registration'}
        </button>
      )}
      {currentStatus === 'approved_unpaid' && !membershipPaid && (
        <button onClick={() => act('mark_paid')} disabled={!!loading}
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading === 'mark_paid' ? '…' : 'Mark Payment Received → Activate'}
        </button>
      )}
      {currentStatus === 'active' && (
        <button onClick={() => act('deactivate')} disabled={!!loading}
          className="text-sm px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50">
          {loading === 'deactivate' ? '…' : 'Deactivate'}
        </button>
      )}
      {currentStatus === 'inactive' && (
        <button onClick={() => act('reactivate')} disabled={!!loading}
          className="text-sm px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">
          {loading === 'reactivate' ? '…' : 'Reactivate'}
        </button>
      )}
      {currentStatus === 'pending_approval' && (
        <button onClick={() => act('reject')} disabled={!!loading}
          className="text-sm px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">
          {loading === 'reject' ? '…' : 'Reject'}
        </button>
      )}
      <button onClick={deleteMember} disabled={!!loading}
        className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
        {loading === 'delete' ? '…' : 'Delete Member'}
      </button>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </div>
  )
}
