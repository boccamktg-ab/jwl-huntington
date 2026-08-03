'use client'

import { useState } from 'react'

export default function JWLDuesUrlForm({ duesUrl }: { duesUrl: string }) {
  const [url, setUrl] = useState(duesUrl)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError('')
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'jwl_dues_url', value: url }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Failed to save.')
    else setSaved(true)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">JWL Dues Payment Link</label>
        <p className="text-xs text-gray-400 mb-2">
          Shown as a "Pay dues" button to members whose dues are overdue. Paste the full CheddarUp URL.
        </p>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://membership-99939.cheddarup.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}
      <button type="submit" disabled={loading}
        className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
