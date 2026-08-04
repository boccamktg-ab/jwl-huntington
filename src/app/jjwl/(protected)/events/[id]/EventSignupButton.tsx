'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TimeSlot = { label: string; capacity: number }

type Props = {
  eventId: string
  memberId: string
  memberName: string
  memberPhone: string
  signedUpSlots: string[]       // slot labels (or [''] for no-slot signup)
  isFull: boolean
  timeSlots: TimeSlot[]
  slotCounts: Record<string, number>
  creditHours: number
}

export default function EventSignupButton({
  eventId, memberId, memberName, memberPhone,
  signedUpSlots, isFull, timeSlots, slotCounts, creditHours,
}: Props) {
  const router = useRouter()
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  const hasSlots = timeSlots.length > 0
  const isSignedUpNoSlot = !hasSlots && signedUpSlots.length > 0

  async function signup(timeSlot: string | null) {
    const key = timeSlot ?? '__noslot__'
    setLoadingSlot(key)
    setError('')
    const res = await fetch('/api/jjwl/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, member_id: memberId, action: 'signup', time_slot: timeSlot }),
    })
    const json = await res.json()
    setLoadingSlot(null)
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      return
    }
    router.refresh()
  }

  async function cancel(timeSlot: string | null) {
    const key = timeSlot ?? '__noslot__'
    setLoadingSlot(key)
    setError('')
    const res = await fetch('/api/jjwl/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, member_id: memberId, action: 'cancel', time_slot: timeSlot }),
    })
    setLoadingSlot(null)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Something went wrong.')
      return
    }
    setConfirmCancel(null)
    router.refresh()
  }

  // ── No time slots ──────────────────────────────────────────────────────────
  if (!hasSlots) {
    if (isSignedUpNoSlot) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium text-blue-900">You&apos;re signed up!</p>
              <p className="text-xs text-blue-600 mt-1">Name: {memberName} · Phone: {memberPhone}</p>
            </div>
          </div>
          {confirmCancel !== '__noslot__' ? (
            <button onClick={() => setConfirmCancel('__noslot__')} className="text-sm text-gray-400 hover:text-red-600">
              Cancel my signup
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">Are you sure you want to cancel?</p>
              <div className="flex gap-3">
                <button onClick={() => cancel(null)} disabled={!!loadingSlot}
                  className="text-sm px-4 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">
                  {loadingSlot ? '…' : 'Yes, cancel'}
                </button>
                <button onClick={() => setConfirmCancel(null)} className="text-sm text-gray-500 hover:text-gray-700">
                  Keep my spot
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )
    }

    if (isFull) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
          <p className="text-gray-500 font-medium">This event is full.</p>
          <p className="text-sm text-gray-400 mt-1">Check back in case a spot opens up.</p>
        </div>
      )
    }

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Sign up for this event</h2>
        <div className="text-sm text-gray-600 space-y-0.5">
          <p>Name: <span className="text-gray-900 font-medium">{memberName}</span></p>
          <p>Phone: <span className="text-gray-900 font-medium">{memberPhone}</span></p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={() => signup(null)}
          disabled={!!loadingSlot}
          className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50"
        >
          {loadingSlot ? 'Signing up…' : 'Confirm Sign-up'}
        </button>
      </div>
    )
  }

  // ── Time slots ─────────────────────────────────────────────────────────────
  const signedSet = new Set(signedUpSlots)
  const anySignedUp = signedSet.size > 0

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Time slots</h2>
        <p className="text-xs text-gray-500 mt-0.5">You can sign up for one or more slots.</p>
      </div>

      <div className="text-sm text-gray-600 space-y-0.5">
        <p>Name: <span className="text-gray-900 font-medium">{memberName}</span></p>
        <p>Phone: <span className="text-gray-900 font-medium">{memberPhone}</span></p>
      </div>

      <div className="space-y-2">
        {timeSlots.map(slot => {
          const count = slotCounts[slot.label] ?? 0
          const slotFull = slot.capacity > 0 && count >= slot.capacity
          const isSignedUp = signedSet.has(slot.label)
          const loading = loadingSlot === slot.label
          const cancelling = confirmCancel === slot.label

          return (
            <div
              key={slot.label}
              className={`flex items-center justify-between border rounded-xl px-4 py-3 transition-colors ${
                isSignedUp ? 'border-[#1B52C1] bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div>
                <p className={`text-sm font-medium ${isSignedUp ? 'text-[#1B52C1]' : 'text-gray-900'}`}>
                  {isSignedUp && <span className="mr-1.5">✅</span>}
                  {slot.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {slot.capacity > 0 ? `${count} / ${slot.capacity} spots filled` : `${count} signed up`}
                </p>
              </div>

              <div className="shrink-0 ml-4">
                {isSignedUp && !cancelling && (
                  <button
                    onClick={() => setConfirmCancel(slot.label)}
                    className="text-xs text-gray-400 hover:text-red-600 underline"
                  >
                    Cancel
                  </button>
                )}
                {isSignedUp && cancelling && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500">Sure?</span>
                    <button
                      onClick={() => cancel(slot.label)}
                      disabled={!!loading}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      {loading ? '…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      No
                    </button>
                  </div>
                )}
                {!isSignedUp && !slotFull && (
                  <button
                    onClick={() => signup(slot.label)}
                    disabled={!!loading}
                    className="text-xs px-3 py-1.5 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1540A0] disabled:opacity-50"
                  >
                    {loading ? '…' : 'Sign up'}
                  </button>
                )}
                {!isSignedUp && slotFull && (
                  <span className="text-xs text-gray-400">Full</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {anySignedUp && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          You earn {creditHours} credit hour{creditHours !== 1 ? 's' : ''} per slot completed.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
