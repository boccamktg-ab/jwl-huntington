'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAssignmentButton({ assignmentId, childCount, redirectTo }: { assignmentId: string; childCount: number; redirectTo?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    const label = childCount > 0
      ? `Delete this assignment? It has ${childCount} child${childCount !== 1 ? 'ren' : ''} — they will be freed back to the unassigned pool.`
      : 'Delete this empty assignment?'
    if (!confirm(label)) return
    setLoading(true)
    const res = await fetch(`/api/admin/assignments/${assignmentId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      alert(json.error || 'Failed to delete.')
      setLoading(false)
      return
    }
    if (redirectTo) router.push(redirectTo)
    else router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
