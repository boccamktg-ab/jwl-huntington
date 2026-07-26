'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RejectFamilyButton({ familyId, familyName }: { familyId: string; familyName: string }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading'>('idle')
  const [reason, setReason] = useState('')
  const router = useRouter()

  async function handleReject() {
    setStep('loading')
    await fetch('/api/admin/families/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family_id: familyId, reason: reason || undefined }),
    })
    router.refresh()
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="text-xs text-red-600 hover:text-red-700 border border-red-200 rounded px-2 py-1"
      >
        Reject
      </button>
    )
  }

  if (step === 'loading') {
    return <span className="text-xs text-gray-400">Rejecting…</span>
  }

  return (
    <div className="space-y-2 text-right">
      <input
        type="text"
        placeholder="Reason (optional)"
        value={reason}
        onChange={e => setReason(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setStep('idle')} className="text-xs text-gray-500 hover:underline">Cancel</button>
        <button
          onClick={handleReject}
          className="text-xs text-white bg-red-600 hover:bg-red-700 rounded px-2 py-1"
        >
          Confirm reject
        </button>
      </div>
    </div>
  )
}
