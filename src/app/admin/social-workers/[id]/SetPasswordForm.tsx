'use client'

import { useState } from 'react'

export default function SetPasswordForm({ swId, swName }: { swId: string; swName: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    if (password !== confirm) { setResult({ error: "Passwords don't match" }); return }
    if (password.length < 8) { setResult({ error: 'Must be at least 8 characters' }); return }

    setLoading(true)
    const res = await fetch(`/api/admin/social-workers/${swId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_password', password }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.ok) {
      setResult({ ok: true })
      setPassword('')
      setConfirm('')
      setOpen(false)
    } else {
      setResult({ error: data.error ?? 'Something went wrong' })
    }
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => { setOpen(true); setResult(null) }}
          className="text-sm bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700"
        >
          Set Password Directly
        </button>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-medium text-orange-800 mb-3">
            Set a temporary password for {swName}. Share it with them and ask them to change it after signing in.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                minLength={8}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                minLength={8}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            {result?.error && (
              <p className="text-xs text-red-600">{result.error}</p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="bg-orange-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50">
                {loading ? 'Saving…' : 'Set Password'}
              </button>
              <button type="button" onClick={() => { setOpen(false); setResult(null) }}
                className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {result?.ok && (
        <p className="mt-2 text-xs text-green-700 font-medium">✓ Password updated. Share the new password with {swName}.</p>
      )}
    </div>
  )
}
