'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type VoteTally = { yes: number; no: number; more_info: number; pending: number }
type VoteDetail = { name: string; vote: string | null; notes: string | null; voted_at: string | null }

type Props = {
  applicationId: string
  currentStatus: string
  requestedAmount: number
  maxAmount: number
  reviewerId: string | null
  voteStatus: string | null
  voteSummary: string | null
}

export default function ReviewerActions({ applicationId, currentStatus, requestedAmount, maxAmount, reviewerId, voteStatus, voteSummary }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [approveAmount, setApproveAmount] = useState(String(Math.min(requestedAmount, maxAmount).toFixed(2)))
  const [denialReason, setDenialReason] = useState('')
  const [showApprove, setShowApprove] = useState(false)
  const [showDeny, setShowDeny] = useState(false)

  const [voteSummaryDraft, setVoteSummaryDraft] = useState(voteSummary ?? '')
  const [showVoteOpen, setShowVoteOpen] = useState(false)
  const [voteLoading, setVoteLoading] = useState<string | null>(null)
  const [voteError, setVoteError] = useState('')
  const [tally, setTally] = useState<VoteTally | null>(null)
  const [voteDetails, setVoteDetails] = useState<VoteDetail[]>([])
  const [showVoteDetails, setShowVoteDetails] = useState(false)

  const fetchTally = useCallback(async () => {
    const res = await fetch(`/api/grants/vote/status?application_id=${applicationId}`)
    if (res.ok) {
      const data = await res.json()
      setTally(data.tally)
      setVoteDetails(data.details)
    }
  }, [applicationId])

  useEffect(() => {
    if (voteStatus) fetchTally()
  }, [voteStatus, fetchTally])

  async function actVote(action: string, body?: object) {
    setVoteLoading(action)
    setVoteError('')
    try {
      const res = await fetch('/api/grants/vote/' + (action === 'open' ? 'open' : 'status'), {
        method: action === 'open' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'open'
          ? { application_id: applicationId, vote_summary: voteSummaryDraft }
          : { application_id: applicationId, action, ...body }
        ),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      router.refresh()
      if (action !== 'open') await fetchTally()
    } catch (err: any) {
      setVoteError(err.message)
    } finally {
      setVoteLoading(null)
    }
  }

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

      {/* Post-approval actions */}
      {currentStatus === 'approved' && (
        <div className="flex gap-2">
          <button onClick={() => act('paid_closed')} disabled={!!loading}
            className="text-sm px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            {loading === 'paid_closed' ? '…' : 'Mark Paid / Closed'}
          </button>
          <button onClick={() => act('unapprove')} disabled={!!loading}
            className="text-sm px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50">
            {loading === 'unapprove' ? '…' : 'Unapprove'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Member Vote Section */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Member Vote</h3>
          {voteStatus && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              voteStatus === 'open' ? 'bg-green-100 text-green-700' :
              voteStatus === 'paused' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {voteStatus === 'open' ? 'Voting open' : voteStatus === 'paused' ? 'Paused — more info requested' : 'Vote closed'}
            </span>
          )}
        </div>

        {/* No vote yet — show open form */}
        {!voteStatus && (
          <>
            {!showVoteOpen ? (
              <button onClick={() => setShowVoteOpen(true)}
                className="text-sm px-4 py-2 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1641a0]">
                Open member vote…
              </button>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">Write a sanitized summary to send to all members</p>
                <p className="text-xs text-blue-600">Do not include identifying information. Members will vote based on this summary only.</p>
                <textarea
                  value={voteSummaryDraft}
                  onChange={e => setVoteSummaryDraft(e.target.value)}
                  rows={6}
                  placeholder="Describe the application: program type, requested amount, household situation, presenting need, reviewer recommendation. Remove names, addresses, or other identifying details."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => actVote('open')}
                    disabled={!voteSummaryDraft.trim() || !!voteLoading}
                    className="text-sm px-4 py-2 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1641a0] disabled:opacity-50">
                    {voteLoading === 'open' ? 'Sending…' : 'Send to all members'}
                  </button>
                  <button onClick={() => setShowVoteOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Vote is active — show tally + controls */}
        {voteStatus && voteStatus !== 'closed' && tally && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              {([
                { label: 'Approve', count: tally.yes, color: 'bg-green-100 text-green-700' },
                { label: 'Deny', count: tally.no, color: 'bg-red-100 text-red-700' },
                { label: 'More info', count: tally.more_info, color: 'bg-amber-100 text-amber-700' },
                { label: 'Pending', count: tally.pending, color: 'bg-gray-100 text-gray-500' },
              ]).map(t => (
                <div key={t.label} className={`rounded-lg px-2 py-2 ${t.color}`}>
                  <div className="text-xl font-bold">{t.count}</div>
                  <div className="text-xs">{t.label}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowVoteDetails(v => !v)} className="text-xs text-[#1B52C1] hover:underline">
              {showVoteDetails ? 'Hide' : 'Show'} individual votes
            </button>

            {showVoteDetails && (
              <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                {voteDetails.map((d, i) => (
                  <div key={i} className={`flex items-start gap-3 px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <span className="font-medium text-gray-800 w-32 shrink-0">{d.name}</span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.vote === 'yes' ? 'bg-green-100 text-green-700' :
                      d.vote === 'no' ? 'bg-red-100 text-red-700' :
                      d.vote === 'more_info' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {d.vote === 'yes' ? 'Approve' : d.vote === 'no' ? 'Deny' : d.vote === 'more_info' ? 'More info' : 'Pending'}
                    </span>
                    {d.notes && <span className="text-gray-500 italic">{d.notes}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {voteStatus === 'paused' && (
                <button onClick={() => actVote('resume')} disabled={!!voteLoading}
                  className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50">
                  {voteLoading === 'resume' ? '…' : 'Resume voting'}
                </button>
              )}
              <button onClick={() => actVote('close')} disabled={!!voteLoading}
                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                {voteLoading === 'close' ? '…' : 'Close vote'}
              </button>
            </div>
          </div>
        )}

        {/* Closed vote — show final tally */}
        {voteStatus === 'closed' && tally && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Final vote results:</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([
                { label: 'Approve', count: tally.yes, color: 'bg-green-100 text-green-700' },
                { label: 'Deny', count: tally.no, color: 'bg-red-100 text-red-700' },
                { label: 'More info', count: tally.more_info, color: 'bg-amber-100 text-amber-700' },
                { label: 'No vote', count: tally.pending, color: 'bg-gray-100 text-gray-400' },
              ]).map(t => (
                <div key={t.label} className={`rounded-lg px-2 py-2 ${t.color}`}>
                  <div className="text-xl font-bold">{t.count}</div>
                  <div className="text-xs">{t.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowVoteDetails(v => !v)} className="text-xs text-[#1B52C1] hover:underline">
              {showVoteDetails ? 'Hide' : 'Show'} individual votes
            </button>
            {showVoteDetails && (
              <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                {voteDetails.map((d, i) => (
                  <div key={i} className={`flex items-start gap-3 px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <span className="font-medium text-gray-800 w-32 shrink-0">{d.name}</span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.vote === 'yes' ? 'bg-green-100 text-green-700' :
                      d.vote === 'no' ? 'bg-red-100 text-red-700' :
                      d.vote === 'more_info' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {d.vote === 'yes' ? 'Approve' : d.vote === 'no' ? 'Deny' : d.vote === 'more_info' ? 'More info' : 'No vote'}
                    </span>
                    {d.notes && <span className="text-gray-500 italic">{d.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {voteError && <p className="text-sm text-red-600">{voteError}</p>}
      </div>

      <DeleteApplication applicationId={applicationId} />
    </div>
  )
}

function DeleteApplication({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch('/api/grants/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId }),
    })
    if (res.ok) {
      router.push('/grants/reviewer')
    } else {
      const { error } = await res.json()
      alert(`Error: ${error}`)
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <div className="pt-2 border-t border-gray-100">
      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="text-xs text-red-500 hover:text-red-700">
          Delete application…
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-red-800">Permanently delete this application and all its documents?</p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={loading}
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
