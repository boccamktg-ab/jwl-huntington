'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase exchanges the token from the URL hash and establishes a session.
    // onAuthStateChange fires with SIGNED_IN / PASSWORD_RECOVERY when ready.
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords don't match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (done) {
    return (
      <>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Password updated</h2>
        <p className="text-sm text-gray-600">Your password has been reset. Redirecting you to sign in…</p>
      </>
    )
  }

  if (!ready) {
    return (
      <>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Reset your password</h2>
        <p className="text-sm text-gray-400">Verifying your reset link…</p>
      </>
    )
  }

  return (
    <>
      <h2 className="text-lg font-medium text-gray-800 mb-6">Choose a new password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center text-gray-500">
        <Link href="/login" className="text-[#1B52C1] hover:underline">Back to sign in</Link>
      </p>
    </>
  )
}
