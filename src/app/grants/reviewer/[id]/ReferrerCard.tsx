'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SW = { id: string; name: string; email: string; type: string }

type Props = {
  applicationId: string
  referrerSw: { name: string; email: string; phone?: string } | null
  adminReferrerName: string | null
  adminReferrerOrg: string | null
  adminReferrerPhone: string | null
  adminReferrerEmail: string | null
  adminNotes: string | null
  assignedSwId: string | null
  socialWorkers: SW[]
}

export default function ReferrerCard({
  applicationId, referrerSw, adminReferrerName, adminReferrerOrg,
  adminReferrerPhone, adminReferrerEmail, adminNotes, assignedSwId, socialWorkers,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    admin_referrer_name: adminReferrerName ?? '',
    admin_referrer_org: adminReferrerOrg ?? '',
    admin_referrer_phone: adminReferrerPhone ?? '',
    admin_referrer_email: adminReferrerEmail ?? '',
    admin_notes: adminNotes ?? '',
    assigned_sw_id: assignedSwId ?? '',
  })
  function setF(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/grants/referrer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save')
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function sendInvite() {
    setInviting(true)
    setError('')
    try {
      const res = await fetch('/api/grants/referrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to send invite')
      setInviteSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setInviting(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs text-gray-500 mb-1'

  // Read-only view
  if (!editing) {
    const hasContact = referrerSw || adminReferrerName
    const assignedSw = socialWorkers.find(sw => sw.id === assignedSwId)

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Referred By</h2>
          <button onClick={() => setEditing(true)}
            className="text-xs text-[#1B52C1] hover:underline">
            Edit
          </button>
        </div>

        {referrerSw ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Name</span><p className="text-gray-900 mt-0.5">{referrerSw.name}</p></div>
            <div><span className="text-gray-500">Email</span><p className="text-gray-900 mt-0.5">{referrerSw.email}</p></div>
            {referrerSw.phone && <div><span className="text-gray-500">Phone</span><p className="text-gray-900 mt-0.5">{referrerSw.phone}</p></div>}
            <div><span className="text-gray-500">Status</span><p className="text-green-700 text-xs mt-0.5 font-medium">Portal member</p></div>
          </div>
        ) : adminReferrerName ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Name</span><p className="text-gray-900 mt-0.5">{adminReferrerName}</p></div>
              {adminReferrerOrg && <div><span className="text-gray-500">Organization</span><p className="text-gray-900 mt-0.5">{adminReferrerOrg}</p></div>}
              {adminReferrerPhone && <div><span className="text-gray-500">Phone</span><p className="text-gray-900 mt-0.5">{adminReferrerPhone}</p></div>}
              {adminReferrerEmail && <div><span className="text-gray-500">Email</span><p className="text-gray-900 mt-0.5">{adminReferrerEmail}</p></div>}
            </div>
            {adminReferrerEmail && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">Not yet on portal</span>
                {inviteSent ? (
                  <span className="text-xs text-green-700">✓ Invite sent</span>
                ) : (
                  <button onClick={sendInvite} disabled={inviting}
                    className="text-xs text-[#1B52C1] hover:underline disabled:opacity-50">
                    {inviting ? 'Sending…' : 'Send portal invite →'}
                  </button>
                )}
              </div>
            )}
            {assignedSw && (
              <div className="border-t border-gray-100 pt-3 text-sm">
                <span className="text-gray-500 text-xs">Assigned portal SW</span>
                <p className="text-gray-900 mt-0.5">{assignedSw.name} <span className="text-gray-400 text-xs">({assignedSw.email})</span></p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No referrer on file. <button onClick={() => setEditing(true)} className="text-[#1B52C1] hover:underline not-italic">Add one →</button></p>
        )}

        {adminNotes && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600">{adminNotes}</div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  // Edit mode
  return (
    <div className="bg-white border border-[#1B52C1] rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Referred By — Edit</h2>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-gray-500">External contact — the person who called or emailed JWL about this case. Not a portal account.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Name</label>
            <input value={form.admin_referrer_name} onChange={e => setF('admin_referrer_name', e.target.value)}
              placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Organization</label>
            <input value={form.admin_referrer_org} onChange={e => setF('admin_referrer_org', e.target.value)}
              placeholder="Agency, school, hospital…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.admin_referrer_phone} onChange={e => setF('admin_referrer_phone', e.target.value)}
              placeholder="(631) 555-0100" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={form.admin_referrer_email} onChange={e => setF('admin_referrer_email', e.target.value)}
              placeholder="referrer@org.com" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Internal Notes</label>
          <textarea value={form.admin_notes} onChange={e => setF('admin_notes', e.target.value)}
            rows={2} placeholder="How they contacted JWL, any context…" className={inputCls + ' resize-none'} />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-2">
        <p className="text-xs text-gray-500">Assign a portal social worker to this file. They will see it in their dashboard and can message the reviewer, upload documents, and track status.</p>
        <select value={form.assigned_sw_id} onChange={e => setF('assigned_sw_id', e.target.value)} className={inputCls}>
          <option value="">— No assignment —</option>
          {socialWorkers.map(sw => (
            <option key={sw.id} value={sw.id}>
              {sw.name} ({sw.type === 'school' ? 'School' : 'Community'}) — {sw.email}
            </option>
          ))}
        </select>
        {form.assigned_sw_id && (
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            This social worker will become the communication contact for this file and will be notified of status changes.
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button onClick={save} disabled={saving}
          className="bg-[#1B52C1] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1540A0] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
          Cancel
        </button>
      </div>
    </div>
  )
}
