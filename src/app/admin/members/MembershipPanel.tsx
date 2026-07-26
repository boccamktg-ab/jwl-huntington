'use client'

import { useState, useEffect } from 'react'

type Position = { id: string; label: string; allows_detail: boolean; is_active: boolean }

type Props = {
  memberId: string
  initialJoinYear: number | null
  initialDuesPaidThrough: number | null
  initialPositionId: string | null
  initialPositionDetail: string | null
  initialPhone: string | null
  onSaved: () => void
}

const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

export default function MembershipPanel({
  memberId, initialJoinYear, initialDuesPaidThrough,
  initialPositionId, initialPositionDetail, initialPhone, onSaved,
}: Props) {
  const [open, setOpen] = useState(false)
  const [positions, setPositions] = useState<Position[]>([])
  const [joinYear, setJoinYear] = useState(initialJoinYear?.toString() ?? '')
  const [duesPaidThrough, setDuesPaidThrough] = useState(initialDuesPaidThrough?.toString() ?? '')
  const [positionId, setPositionId] = useState(initialPositionId ?? '')
  const [positionDetail, setPositionDetail] = useState(initialPositionDetail ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && positions.length === 0) {
      fetch('/api/admin/member-positions').then(r => r.json()).then(j => setPositions(j.positions ?? []))
    }
  }, [open])

  const currentYear = new Date().getFullYear()
  const selectedPosition = positions.find(p => p.id === positionId)

  async function save() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/members/dues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        join_year: joinYear ? Number(joinYear) : null,
        dues_paid_through_year: duesPaidThrough ? Number(duesPaidThrough) : null,
        position_id: positionId || null,
        position_detail: positionDetail || null,
        phone: phone || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }
    setSaving(false)
    setOpen(false)
    onSaved()
  }

  const years = Array.from({ length: 30 }, (_, i) => currentYear - i)

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-[#1B52C1] hover:underline">
        Edit membership
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Edit membership</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Join year</label>
                <select value={joinYear} onChange={e => setJoinYear(e.target.value)} className={`w-full ${inputCls}`}>
                  <option value="">—</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dues paid through</label>
                <select value={duesPaidThrough} onChange={e => setDuesPaidThrough(e.target.value)} className={`w-full ${inputCls}`}>
                  <option value="">—</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                  <option value={currentYear + 1}>{currentYear + 1}</option>
                  <option value={currentYear + 2}>{currentYear + 2}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
              <select value={positionId} onChange={e => { setPositionId(e.target.value); setPositionDetail('') }} className={`w-full ${inputCls}`}>
                <option value="">— No position selected —</option>
                {positions.filter(p => p.is_active).map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {selectedPosition?.allows_detail && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Position detail</label>
                <input type="text" value={positionDetail} onChange={e => setPositionDetail(e.target.value)}
                  placeholder="e.g. Education Committee" className={`w-full ${inputCls}`} />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(555) 555-5555" className={`w-full ${inputCls}`} />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving}
                className="flex-1 bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
