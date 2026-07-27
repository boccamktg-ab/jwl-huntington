'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  familyId: string
  childId: string
  childName: string
  originalSpanish: string
  translatedEnglish: string
}

export default function TranslationReviewCard({
  familyId,
  childId,
  childName,
  originalSpanish,
  translatedEnglish,
}: Props) {
  const router = useRouter()
  const [edited, setEdited] = useState(translatedEnglish)
  const [saving, setSaving] = useState(false)

  async function confirm() {
    setSaving(true)
    await fetch(`/api/dashboard/families/${familyId}/translation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, giftRequestsEn: edited }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Translation review</span>
        <span className="text-xs text-amber-600">— {childName}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Original (Spanish)</p>
          <p className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 p-3 whitespace-pre-wrap min-h-[60px]">
            {originalSpanish}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">English translation — edit if needed</p>
          <textarea
            rows={3}
            value={edited}
            onChange={e => setEdited(e.target.value)}
            className="w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={confirm}
          disabled={saving}
          className="bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Confirm translation'}
        </button>
        <p className="text-xs text-gray-400">
          The confirmed English text will be shown in the JWL portal. The original Spanish is always preserved for the family.
        </p>
      </div>
    </div>
  )
}
