'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  familyId: string
  status: string
  childCount: number
  expectedCount: number
  linkToken: string
  pendingTranslations: number
}

export default function FamilyActions({ familyId, status, childCount, expectedCount, linkToken, pendingTranslations }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const familyLink = `${origin}/family/${linkToken}`

  async function updateStatus(newStatus: 'submitted' | 'approved') {
    setLoading(true)
    const res = await fetch(`/api/families/${familyId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const json = await res.json()
      alert(json.error || 'Something went wrong.')
    }
    router.refresh()
    setLoading(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(familyLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (status === 'approved') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
        ✓ Approved — this family is visible to JWL admin
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Copy link */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Family submission link</p>
        <p className="text-xs text-gray-400 mb-2">Copy this link and send it to the parent or guardian. They can open it on any device — no login required — to enter their children's details.</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={familyLink}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 bg-gray-50"
          />
          <button
            onClick={copyLink}
            className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Approve help */}
      {(status === 'draft' || status === 'submitted') && childCount > 0 && pendingTranslations === 0 && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          Ready to approve? Double-check that all children's information is correct. Once approved, the family is sent to JWL for gift matching and <strong className="text-gray-500">no further edits can be made.</strong>
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {status === 'draft' && (
          <button
            onClick={() => updateStatus('submitted')}
            disabled={loading || childCount === 0}
            className="text-sm px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50"
          >
            Mark as submitted
          </button>
        )}
        {(status === 'draft' || status === 'submitted') && (
          <button
            onClick={() => updateStatus('approved')}
            disabled={loading || childCount === 0 || pendingTranslations > 0}
            className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {childCount === 0 && (
          <p className="text-xs text-gray-400 self-center">Add at least one child to approve</p>
        )}
        {pendingTranslations > 0 && (
          <p className="text-xs text-amber-700 self-center">
            Review {pendingTranslations === 1 ? '1 translation' : `${pendingTranslations} translations`} above before approving
          </p>
        )}
      </div>
    </div>
  )
}
