'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  id?: string
  action: string
  label: string
  variant: 'green' | 'gray' | 'blue' | 'ghost'
  confirmedCount?: number
}

const MAX_CONFIRMED = 15

export default function BackpackActions({ id, action, label, variant, confirmedCount = 0 }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cls = {
    green: 'text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700',
    gray: 'text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200',
    blue: 'text-sm px-3 py-1.5 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1540a0]',
    ghost: 'text-xs text-[#1B52C1] hover:underline',
  }[variant]

  async function run() {
    if (action === 'confirm' && confirmedCount >= MAX_CONFIRMED) {
      setError(`At capacity (${MAX_CONFIRMED}). Use Waitlist.`)
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/backpacks/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    const data = await res.json()
    if (!data.ok) setError(data.error ?? 'Error')
    else router.refresh()
    setLoading(false)
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <button onClick={run} disabled={loading} className={`${cls} disabled:opacity-50`}>
        {loading ? '…' : label}
      </button>
      {error && <p className="text-xs text-red-500 max-w-[140px]">{error}</p>}
    </div>
  )
}
