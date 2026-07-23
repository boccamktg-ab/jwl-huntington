'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmailPasswordForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (newPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const updates: { email?: string; password?: string } = {}
    if (email !== currentEmail) updates.email = email
    if (newPassword) updates.password = newPassword

    if (Object.keys(updates).length === 0) {
      setError('No changes to save.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser(updates)
    if (updateError) {
      setError(updateError.message)
    } else {
      if (updates.email) {
        setMessage('Check your new email address for a confirmation link.')
      } else {
        setMessage('Password updated successfully.')
      }
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
        {email !== currentEmail && (
          <p className="text-xs text-amber-600 mt-1">You&apos;ll receive a confirmation link at the new address.</p>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Change Password</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password" className={inputCls} />
        </div>
        {newPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <button type="submit" disabled={loading}
        className="bg-[#1B52C1] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
