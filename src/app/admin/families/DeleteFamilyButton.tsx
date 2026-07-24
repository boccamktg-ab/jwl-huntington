'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteFamilyButton({ familyId, familyNumber }: { familyId: string; familyNumber: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch('/api/admin/families', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const { error } = await res.json()
      alert(`Error: ${error}`)
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Delete family {familyNumber}?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700"
    >
      Delete
    </button>
  )
}
