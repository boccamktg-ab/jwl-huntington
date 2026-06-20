'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function MemberActions({ memberId, status, isAdmin, isGrantsReviewer }: { memberId: string; status: string; isAdmin: boolean; isGrantsReviewer: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function act(action: 'approve' | 'disable' | 'enable' | 'toggle_admin' | 'toggle_grants_reviewer') {
    setLoading(action)
    await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, action }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2 justify-end">
      {status === 'pending' && (
        <>
          <button onClick={() => act('approve')} disabled={!!loading}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading === 'approve' ? '…' : 'Approve'}
          </button>
          <button onClick={() => act('disable')} disabled={!!loading}
            className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">
            {loading === 'disable' ? '…' : 'Reject'}
          </button>
        </>
      )}
      {status === 'approved' && (
        <>
          <button onClick={() => act('toggle_grants_reviewer')} disabled={!!loading}
            className={`text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ${isGrantsReviewer ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
            {loading === 'toggle_grants_reviewer' ? '…' : isGrantsReviewer ? 'Grants ✓' : 'Grants'}
          </button>
          <button onClick={() => act('toggle_admin')} disabled={!!loading}
            className={`text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ${isAdmin ? 'bg-[#1B52C1] text-white hover:bg-[#1540A0]' : 'bg-blue-100 text-[#1B52C1] hover:bg-blue-200'}`}>
            {loading === 'toggle_admin' ? '…' : isAdmin ? 'Admin ✓' : 'Admin'}
          </button>
          <button onClick={() => act('disable')} disabled={!!loading}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            {loading === 'disable' ? '…' : 'Disable'}
          </button>
        </>
      )}
      {status === 'disabled' && (
        <button onClick={() => act('enable')} disabled={!!loading}
          className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50">
          {loading === 'enable' ? '…' : 'Re-enable'}
        </button>
      )}
    </div>
  )
}
