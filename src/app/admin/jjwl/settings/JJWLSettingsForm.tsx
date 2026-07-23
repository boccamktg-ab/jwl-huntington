'use client'

import { useState } from 'react'

export default function JJWLSettingsForm({ cheddarUpUrl }: { cheddarUpUrl: string }) {
  const [url, setUrl] = useState(cheddarUpUrl)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError('')
    const res = await fetch('/api/jjwl/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jjwl_cheddarup_url: url }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to save.')
    } else {
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CheddarUp Payment Link
        </label>
        <p className="text-xs text-gray-400 mb-2">
          This link is sent to members when their registration is approved. Paste the full CheddarUp URL here.
        </p>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://app.cheddarup.com/..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Settings saved.</p>}
      <button type="submit" disabled={loading}
        className="bg-[#1B52C1] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
        {loading ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  )
}
