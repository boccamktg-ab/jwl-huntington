'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Check your email</h2>
        <p className="text-sm text-gray-600 mb-6">
          If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly. Check your spam folder if it doesn't arrive within a few minutes.
        </p>
        <Link href="/login" className="text-sm text-[#1B52C1] hover:underline">
          ← Back to sign in
        </Link>
      </>
    )
  }

  return (
    <>
      <h2 className="text-lg font-medium text-gray-800 mb-2">Reset your password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter the email address on your account and we'll send you a reset link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
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
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center text-gray-500">
        Remembered it?{' '}
        <Link href="/login" className="text-[#1B52C1] hover:underline">Sign in</Link>
      </p>
    </>
  )
}
