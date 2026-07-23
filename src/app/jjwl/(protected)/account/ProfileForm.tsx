'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  memberId: string
  initialPhone: string
  initialParentName: string
  initialParentPhone: string
  initialParentEmail: string
}

export default function ProfileForm({ memberId, initialPhone, initialParentName, initialParentPhone, initialParentEmail }: Props) {
  const router = useRouter()
  const [phone, setPhone] = useState(initialPhone)
  const [parentName, setParentName] = useState(initialParentName)
  const [parentPhone, setParentPhone] = useState(initialParentPhone)
  const [parentEmail, setParentEmail] = useState(initialParentEmail)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError('')
    const res = await fetch('/api/jjwl/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, phone, parent_name: parentName, parent_phone: parentPhone, parent_email: parentEmail }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to save.')
    } else {
      setSaved(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your phone <span className="text-red-400">*</span></label>
        <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parent / Guardian</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent name</label>
          <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent phone</label>
            <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent email</label>
            <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved successfully.</p>}

      <button type="submit" disabled={loading}
        className="bg-[#1B52C1] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
