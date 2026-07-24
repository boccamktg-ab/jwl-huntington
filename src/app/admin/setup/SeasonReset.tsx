'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SeasonReset() {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading' | 'done'>('idle')

  async function handleReset() {
    setStep('loading')
    const res = await fetch('/api/admin/season-reset', { method: 'POST' })
    if (res.ok) {
      setStep('done')
      router.refresh()
    } else {
      const { error } = await res.json()
      alert(`Error: ${error}`)
      setStep('idle')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Season Reset</h2>
      <p className="text-sm text-gray-500 mb-4">
        Clears all member assignments and returns every family to draft status so social workers can review, update, and re-submit for the new season. Children&apos;s data is preserved.
      </p>

      {step === 'idle' && (
        <button
          onClick={() => setStep('confirm')}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50"
        >
          Reset season…
        </button>
      )}

      {step === 'confirm' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">
            This will delete all assignments and reset all families to draft. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Yes, reset the season
            </button>
            <button
              onClick={() => setStep('idle')}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <p className="text-sm text-gray-500">Resetting…</p>
      )}

      {step === 'done' && (
        <p className="text-sm text-green-700 font-medium">Season reset complete. Families are back in draft.</p>
      )}
    </div>
  )
}
