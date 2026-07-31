'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function VotePage() {
  const params = useParams()
  const token = params.token as string

  const [selected, setSelected] = useState<'yes' | 'no' | 'more_info' | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!selected) return
    if (selected === 'more_info' && !notes.trim()) {
      setError('Please enter your question or the information you need.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/grants/vote/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: selected, notes: notes.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    const labels = { yes: 'Approve', no: 'Deny', more_info: 'Request More Information' }
    const icons = { yes: '✅', no: '❌', more_info: '❓' }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">{icons[selected!]}</div>
          <h1 className="text-2xl font-bold text-gray-900">Vote Recorded</h1>
          <p className="text-gray-500">
            Your vote of <strong>{labels[selected!]}</strong> has been recorded. The grants admin will review all member votes before making a final decision.
          </p>
          <a href="https://portal.jwlhuntington.org/members" className="inline-block mt-2 bg-[#1B52C1] text-white px-6 py-3 rounded-lg font-semibold text-sm">
            Return to portal
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-lg w-full space-y-6">
        <div>
          <div className="text-xs font-semibold text-[#1B52C1] uppercase tracking-wide mb-1">JWL Huntington — Grants</div>
          <h1 className="text-xl font-bold text-gray-900">Member Vote</h1>
          <p className="text-sm text-gray-500 mt-1">
            Please review the application summary sent to your email and cast your vote below.
          </p>
        </div>

        <div className="space-y-3">
          {([
            { value: 'yes', label: 'Approve', desc: 'I support this grant application.', icon: '✅', color: 'border-green-500 bg-green-50' },
            { value: 'no', label: 'Deny', desc: 'I do not support this grant application.', icon: '❌', color: 'border-red-500 bg-red-50' },
            { value: 'more_info', label: 'Request More Information', desc: 'I need more details before I can vote.', icon: '❓', color: 'border-amber-500 bg-amber-50' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                selected === opt.value ? opt.color + ' shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{opt.icon}</span>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 ${
                  selected === opt.value ? 'border-[#1B52C1] bg-[#1B52C1]' : 'border-gray-300'
                }`} />
              </div>
            </button>
          ))}
        </div>

        {selected === 'more_info' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              What information do you need? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe what additional information or clarification you need before you can vote…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <p className="text-xs text-gray-400">
              Your question will be sent to the grants admin. The vote will be paused until they respond.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={submit}
          disabled={!selected || submitting}
          className="w-full bg-[#1B52C1] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1641a0] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Submit vote'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          If you did not request this or have questions, contact <a href="mailto:Info@JWLHuntington.org" className="underline">Info@JWLHuntington.org</a>.
        </p>
      </div>
    </div>
  )
}
