'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  applicationId: string
  currentStatus: string
  requestedAmount: number
  maxAmount: number
  reviewerId: string | null
}

export default function ReviewerActions({ applicationId, currentStatus, requestedAmount, maxAmount, reviewerId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [approveAmount, setApproveAmount] = useState(String(Math.min(requestedAmount, maxAmount).toFixed(2)))
  const [denialReason, setDenialReason] = useState('')
  const [showApprove, setShowApprove] = useState(false)
  const [showDeny, setShowDeny] = useState(false)

  async function act(action: string, extra?: object) {
    setLoading(action)
    setError('')
    try {
      const res = await fetch('/api/grants/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, action, reviewer_id: reviewerId, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Review Actions</h2>

      {/* Status transitions */}
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'submitted' && (
          <button onClick={() => act('under_review')} disabled={!!loading}
            className="text-sm px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50">
            {loading === 'under_review' ? '…' : 'Mark Under Review'}
          </button>
        )}
        {['submitted', 'under_review'].includes(currentStatus) && (
          <button onClick={() => act('needs_more_info')} disabled={!!loading}
            className="text-sm px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50">
            {loading === 'needs_more_info' ? '…' : 'Request More Info'}
          </button>
        )}
        {currentStatus === 'needs_more_info' && (
          <button onClick={() => act('under_review')} disabled={!!loading}
            className="text-sm px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50">
            {loading === 'under_review' ? '…' : 'Resume Review'}
          </button>
        )}
      </div>

      {/* Approve */}
      {!showDeny && (
        <div className="space-y-2">
          {!showApprove ? (
            <button onClick={() => setShowApprove(true)}
              className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Approve…
            </button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-green-800">Confirm approval</p>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 shrink-0">Award amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number" min="1" max={maxAmount} step="0.01"
                    value={approveAmount}
                    onChange={e => setApproveAmount(e.target.value)}
                    className="border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <span className="text-xs text-gray-400">max ${maxAmount.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => act('approve', { approved_amount: parseFloat(approveAmount) })}
                  disabled={!!loading}
                  className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {loading === 'approve' ? 'Approving…' : 'Confirm Approval'}
                </button>
                <button onClick={() => setShowApprove(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deny */}
      {!showApprove && (
        <div className="space-y-2">
          {!showDeny ? (
            <button onClick={() => setShowDeny(true)}
              className="text-sm px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
              Deny…
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-red-800">Confirm denial</p>
              <textarea
                value={denialReason}
                onChange={e => setDenialReason(e.target.value)}
                rows={3}
                placeholder="Reason for denial (shown to referrer)…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => act('deny', { denial_reason: denialReason })}
                  disabled={!!loading || !denialReason.trim()}
                  className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {loading === 'deny' ? 'Denying…' : 'Confirm Denial'}
                </button>
                <button onClick={() => setShowDeny(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mark paid/closed (after approval) */}
      {currentStatus === 'approved' && (
        <button onClick={() => act('paid_closed')} disabled={!!loading}
          className="text-sm px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50">
          {loading === 'paid_closed' ? '…' : 'Mark Paid / Closed'}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
