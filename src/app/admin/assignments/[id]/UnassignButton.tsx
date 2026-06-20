'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnassignButton({ assignmentId, childId, childName }: {
  assignmentId: string
  childId: string
  childName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleUnassign() {
    if (!confirm(`Remove ${childName} from this assignment? They will become available to assign to someone else.`)) return
    setLoading(true)
    await fetch(`/api/admin/assignments/${assignmentId}/children`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleUnassign}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {loading ? '…' : 'Unassign'}
    </button>
  )
}
