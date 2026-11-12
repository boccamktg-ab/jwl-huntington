'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReturnFamilyButton({ familyId, familyNumber }: { familyId: string; familyNumber: number }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading'>('idle')
  const [note, setNote] = useState('')
  const router = useRouter()

  async function handleReturn() {
    setStep('loading')
    await fetch('/api/admin/families/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family_id: familyId, note: note || undefined }),
    })
    router.refresh()
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="text-xs text-amber-700 hover:text-amber-800 border border-amber-200 rounded px-2 py-1"
      >
        Return to SW
      </button>
    )
  }

  if (step === 'loading') {
    return <span className="text-xs text-gray-400">Returning…</span>
  }

  return (
    <div className="space-y-2 text-right">
      <input
        type="text"
        placeholder="Note for social worker (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setStep('idle')} className="text-xs text-gray-500 hover:underline">Cancel</button>
        <button
          onClick={handleReturn}
          className="text-xs text-white bg-amber-600 hover:bg-amber-700 rounded px-2 py-1"
        >
          Confirm return
        </button>
      </div>
    </div>
  )
}
