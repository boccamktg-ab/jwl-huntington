'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function MemberActions({ memberId, name, status, isAdmin, isProgramsAdmin, isGrantsReviewer, isJjwlAdmin, isSuperAdmin }: { memberId: string; name: string; status: string; isAdmin: boolean; isProgramsAdmin: boolean; isGrantsReviewer: boolean; isJjwlAdmin: boolean; isSuperAdmin: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [setPwOpen, setSetPwOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)

  async function act(action: 'approve' | 'disable' | 'enable' | 'toggle_admin' | 'toggle_programs_admin' | 'toggle_grants_reviewer' | 'toggle_jjwl_admin' | 'toggle_super_admin' | 'reset_password') {
    setLoading(action)
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, action }),
    })
    setLoading(null)
    if (action === 'reset_password') {
      if (res.ok) { setResetSent(true); setTimeout(() => setResetSent(false), 4000) }
      else { const j = await res.json(); alert(j.error || 'Failed to send reset.') }
      return
    }
    router.refresh()
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (newPassword !== pwConfirm) { setPwError("Passwords don't match."); return }
    if (newPassword.length < 8) { setPwError('Must be at least 8 characters.'); return }
    setPwLoading(true)
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, action: 'set_password', password: newPassword }),
    })
    const json = await res.json()
    setPwLoading(false)
    if (!res.ok) { setPwError(json.error || 'Failed to set password.'); return }
    setPwDone(true)
    setSetPwOpen(false)
    setNewPassword('')
    setPwConfirm('')
    setTimeout(() => setPwDone(false), 5000)
  }

  async function deleteMember() {
    if (!confirm(`Permanently delete ${name}? Their assignment records will be kept but unlinked. This cannot be undone.`)) return
    setLoading('delete')
    await fetch('/api/admin/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {pwDone && (
        <p className="text-xs text-green-700 font-medium text-right">✓ Password updated. Share it with {name}.</p>
      )}

      {setPwOpen && (
        <form onSubmit={handleSetPassword} className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
          <p className="text-xs text-orange-800 font-medium">Set a temporary password for {name} and share it with them directly.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
              <input type="password" required minLength={8} autoFocus value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm</label>
              <input type="password" required minLength={8} value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          {pwError && <p className="text-xs text-red-600">{pwError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pwLoading}
              className="bg-orange-600 text-white text-xs px-3 py-1.5 rounded hover:bg-orange-700 disabled:opacity-50">
              {pwLoading ? 'Saving…' : 'Set password'}
            </button>
            <button type="button" onClick={() => { setSetPwOpen(false); setPwError('') }}
              className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2 justify-end flex-wrap">
      {status === 'pending' && (
        <>
          <button onClick={() => act('approve')} disabled={!!loading}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading === 'approve' ? '…' : 'Approve'}
          </button>
          <button onClick={() => act('disable')} disabled={!!loading}
            className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">
            {loading === 'disable' ? '…' : 'Reject'}
          </button>
        </>
      )}
      {status === 'approved' && (
        <>
          <button onClick={() => act('toggle_programs_admin')} disabled={!!loading}
            className={`text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ${isProgramsAdmin ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>
            {loading === 'toggle_programs_admin' ? '…' : isProgramsAdmin ? 'Programs ✓' : 'Programs'}
          </button>
          <button onClick={() => act('toggle_grants_reviewer')} disabled={!!loading}
            className={`text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ${isGrantsReviewer ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
            {loading === 'toggle_grants_reviewer' ? '…' : isGrantsReviewer ? 'Grants ✓' : 'Grants'}
          </button>
          <button onClick={() => act('toggle_jjwl_admin')} disabled={!!loading}
            className={`text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ${isJjwlAdmin ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'}`}>
            {loading === 'toggle_jjwl_admin' ? '…' : isJjwlAdmin ? 'JJWL ✓' : 'JJWL'}
          </button>
          <button onClick={() => act('toggle_admin')} disabled={!!loading}
            className={`text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ${isAdmin ? 'bg-[#1B52C1] text-white hover:bg-[#1540A0]' : 'bg-blue-100 text-[#1B52C1] hover:bg-blue-200'}`}>
            {loading === 'toggle_admin' ? '…' : isAdmin ? 'Admin ✓' : 'Admin'}
          </button>
          <button onClick={() => act('toggle_super_admin')} disabled={!!loading}
            className={`text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ${isSuperAdmin ? 'bg-gray-800 text-white hover:bg-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {loading === 'toggle_super_admin' ? '…' : isSuperAdmin ? 'Super ✓' : 'Super'}
          </button>
          <button onClick={() => act('disable')} disabled={!!loading}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            {loading === 'disable' ? '…' : 'Disable'}
          </button>
        </>
      )}
      {status === 'disabled' && (
        <button onClick={() => act('enable')} disabled={!!loading}
          className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50">
          {loading === 'enable' ? '…' : 'Re-enable'}
        </button>
      )}
      <button
        onClick={() => act('reset_password')}
        disabled={!!loading}
        className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
      >
        {loading === 'reset_password' ? '…' : resetSent ? 'Reset sent ✓' : 'Send reset email'}
      </button>
      <button
        onClick={() => { setSetPwOpen(o => !o); setPwError(''); setPwDone(false) }}
        className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
      >
        Set password
      </button>
      <button onClick={deleteMember} disabled={!!loading}
        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
        {loading === 'delete' ? '…' : 'Delete'}
      </button>
    </div>
    </div>
  )
}
