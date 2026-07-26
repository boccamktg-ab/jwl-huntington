'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

export default function AccountForm({ memberId, initialName, initialPhone, authId }: {
  memberId: string; initialName: string; initialPhone: string; authId: string
}) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  async function saveProfile() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/members/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Profile updated.' : 'Failed to save.')
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { setPwMsg('Passwords do not match.'); return }
    if (newPassword.length < 8) { setPwMsg('Password must be at least 8 characters.'); return }
    setSavingPw(true)
    setPwMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPw(false)
    if (error) { setPwMsg(error.message); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setPwMsg('Password updated.')
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" className={inputCls} />
        </div>
        {msg && <p className={`text-sm ${msg.includes('updated') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
        <button onClick={saveProfile} disabled={saving}
          className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* Password */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Change password</h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} />
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.includes('updated') ? 'text-green-600' : 'text-red-600'}`}>{pwMsg}</p>}
        <button onClick={changePassword} disabled={savingPw || !newPassword}
          className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
          {savingPw ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </div>
  )
}
