'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ShiftSignupButton({ shiftId, signedUp }: { shiftId: string; signedUp: boolean }) {
  const [active, setActive] = useState(signedUp)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    if (loading) return
    setLoading(true)
    await fetch('/api/meetings/shift-signup', {
      method: active ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId }),
    })
    setActive(a => !a)
    setLoading(false)
    router.refresh()
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'border border-[#1B52C1] text-[#1B52C1] hover:bg-blue-50'
      }`}>
      {active ? '✓ Signed up' : 'Sign up'}
    </button>
  )
}
