'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type School = { id: string; name: string; districtName: string }

type Props = {
  sw: {
    id: string
    name: string
    email: string
    swType: string
    organization: string | null
    schoolIds: string[]
  }
  allSchools: School[]
}

export default function EditSwForm({ sw, allSchools }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: sw.name,
    email: sw.email,
    swType: sw.swType,
    organization: sw.organization ?? '',
    schoolIds: sw.schoolIds,
  })
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState('')

  function toggleSchool(id: string) {
    setForm(prev => ({
      ...prev,
      schoolIds: prev.schoolIds.includes(id)
        ? prev.schoolIds.filter(s => s !== id)
        : [...prev.schoolIds, id],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/social-workers/${sw.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        swType: form.swType,
        organization: form.swType === 'community' ? form.organization : null,
        schoolIds: form.swType === 'school' ? form.schoolIds : [],
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error || 'Failed to save.'); return }
    setOpen(false)
    router.refresh()
  }

  async function handlePasswordReset() {
    if (!confirm(`Send a password reset email to ${sw.email}?`)) return
    setResetLoading(true)
    const res = await fetch(`/api/admin/social-workers/${sw.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password' }),
    })
    const json = await res.json()
    setResetLoading(false)
    if (!res.ok) { alert(json.error || 'Failed to send reset.'); return }
    setResetSent(true)
    setTimeout(() => setResetSent(false), 4000)
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1"
        >
          Edit
        </button>
        <button
          onClick={handlePasswordReset}
          disabled={resetLoading}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 disabled:opacity-50"
        >
          {resetLoading ? 'Sending…' : resetSent ? 'Reset sent ✓' : 'Send password reset'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="mt-4 border-t border-gray-100 pt-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">Edit details</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
        <select
          value={form.swType}
          onChange={e => setForm(p => ({ ...p, swType: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="school">School-based social worker</option>
          <option value="community">Community / organization</option>
        </select>
      </div>

      {form.swType === 'community' ? (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
          <input
            type="text"
            value={form.organization}
            onChange={e => setForm(p => ({ ...p, organization: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Schools</label>
          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {allSchools.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer py-1 px-1 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={form.schoolIds.includes(s.id)}
                  onChange={() => toggleSchool(s.id)}
                  className="rounded"
                />
                <span className="text-gray-800">{s.name}</span>
                <span className="text-xs text-gray-400">{s.districtName}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError('') }}
          className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
