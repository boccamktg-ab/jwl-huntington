'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

export default function AccountForm({ memberId, initialName, initialPhone, authId, initialAvatarUrl }: {
  memberId: string; initialName: string; initialPhone: string; authId: string; initialAvatarUrl?: string | null
}) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setAvatarMsg('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/members/avatar', { method: 'POST', body: form })
    const json = await res.json()
    if (!res.ok) { setAvatarMsg(json.error); setUploadingAvatar(false); return }
    setAvatarUrl(json.url)
    setUploadingAvatar(false)
    setAvatarMsg('Photo updated.')
  }

  async function removeAvatar() {
    setUploadingAvatar(true)
    await fetch('/api/members/avatar', { method: 'DELETE' })
    setAvatarUrl(null)
    setUploadingAvatar(false)
    setAvatarMsg('Photo removed.')
  }

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
      {/* Avatar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile photo</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300 font-semibold">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className={`inline-block cursor-pointer text-sm px-3 py-1.5 border rounded-lg font-medium transition-colors ${uploadingAvatar ? 'opacity-50 pointer-events-none' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
              <input type="file" accept="image/*" className="sr-only" onChange={uploadAvatar} disabled={uploadingAvatar} />
            </label>
            {avatarUrl && (
              <button onClick={removeAvatar} disabled={uploadingAvatar}
                className="block text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
                Remove photo
              </button>
            )}
            <p className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB</p>
            {avatarMsg && <p className={`text-xs ${avatarMsg.includes('updated') || avatarMsg.includes('removed') ? 'text-green-600' : 'text-red-600'}`}>{avatarMsg}</p>}
          </div>
        </div>
      </div>

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
