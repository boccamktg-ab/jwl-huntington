'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JJWLRegistrationToggle({ registrationOpen }: { registrationOpen: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(registrationOpen)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const newValue = !open
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'jjwl_registration_open', value: String(newValue) }),
    })
    if (res.ok) {
      setOpen(newValue)
    } else {
      alert('Failed to save — please try again.')
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-700">JJWL registration</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {open
            ? 'New members can currently register at /jjwl/register.'
            : 'Registration is closed — the page shows a "closed" message.'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${open ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${open ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
