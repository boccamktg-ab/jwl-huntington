'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TimeSlot = { label: string; capacity: number }

type Props = {
  eventId: string
  memberId: string
  memberName: string
  memberPhone: string
  isSignedUp: boolean
  currentSlot: string | null
  isFull: boolean
  timeSlots: TimeSlot[]
  slotCounts: Record<string, number>
}

export default function EventSignupButton({
  eventId, memberId, memberName, memberPhone,
  isSignedUp, currentSlot, isFull, timeSlots, slotCounts,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(currentSlot ?? '')
  const [confirming, setConfirming] = useState(false)

  async function act(action: 'signup' | 'cancel') {
    setLoading(true)
    setError('')
    const res = await fetch('/api/jjwl/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        member_id: memberId,
        action,
        time_slot: action === 'signup' ? (selectedSlot || null) : undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    router.refresh()
  }

  if (isSignedUp) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-blue-900">You&apos;re signed up!</p>
            {currentSlot && <p className="text-sm text-blue-700 mt-0.5">Slot: {currentSlot}</p>}
            <p className="text-xs text-blue-600 mt-1">Name on file: {memberName} · Phone: {memberPhone}</p>
          </div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-sm text-gray-400 hover:text-red-600">
            Cancel my signup
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">Are you sure you want to cancel?</p>
            <div className="flex gap-3">
              <button onClick={() => act('cancel')} disabled={loading}
                className="text-sm px-4 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">
                {loading ? '…' : 'Yes, cancel'}
              </button>
              <button onClick={() => setConfirming(false)} className="text-sm text-gray-500 hover:text-gray-700">
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

      {timeSlots.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Select a time slot</p>
          {timeSlots.map(slot => {
            const count = slotCounts[slot.label] ?? 0
            const slotFull = count >= slot.capacity
            return (
              <label key={slot.label} className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                selectedSlot === slot.label ? 'border-[#1B52C1] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              } ${slotFull ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="time_slot"
                  value={slot.label}
                  checked={selectedSlot === slot.label}
                  disabled={slotFull}
                  onChange={() => setSelectedSlot(slot.label)}
                  className="text-[#1B52C1]"
                />
                <span className="text-sm text-gray-900">{slot.label}</span>
                <span className="ml-auto text-xs text-gray-400">{count}/{slot.capacity} spots</span>
              </label>
            )
          })}
        </div>
      )}

      {timeSlots.length > 0 && !selectedSlot && (
        <p className="text-xs text-amber-600">Please select a time slot to continue.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={() => act('signup')}
        disabled={loading || (timeSlots.length > 0 && !selectedSlot)}
        className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50"
      >
        {loading ? 'Signing up…' : 'Confirm Sign-up'}
      </button>
    </div>
  )
}
