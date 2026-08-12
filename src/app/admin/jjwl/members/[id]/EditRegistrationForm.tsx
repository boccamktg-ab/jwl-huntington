'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type School = { id: string; name: string }

type Props = {
  memberId: string
  initial: {
    name: string
    phone: string | null
    grade: string | null
    school_id: string | null
    parent_name: string | null
    parent_phone: string | null
    parent_email: string | null
    notes: string | null
  }
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]/30 focus:border-[#1B52C1]'

export default function EditRegistrationForm({ memberId, initial }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [form, setForm] = useState({ ...initial, grade: initial.grade != null ? String(initial.grade) : null })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null)

  useEffect(() => {
    if (open && schools.length === 0) {
      fetch('/api/jjwl/schools').then(r => r.json()).then(d => {
        if (d.schools) setSchools(d.schools)
      })
    }
  }, [open])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setResult(null)
  }

  async function save() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/jjwl/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, action: 'update_info', ...form }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ ok: true })
        router.refresh()
        setTimeout(() => setOpen(false), 800)
      } else {
        setResult({ error: data.error ?? 'Something went wrong.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const GRADES = ['6', '7', '8', '9', '10', '11', '12']

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-[#1B52C1] hover:underline"
        >
          Edit registration info
        </button>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone ?? ''}
                onChange={e => set('phone', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Grade</label>
              <select value={form.grade ?? ''} onChange={e => set('grade', e.target.value)} className={inputCls}>
                <option value="">—</option>
                {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">School</label>
              <select value={form.school_id ?? ''} onChange={e => set('school_id', e.target.value)} className={inputCls}>
                <option value="">—</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Parent name</label>
              <input
                type="text"
                value={form.parent_name ?? ''}
                onChange={e => set('parent_name', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Parent phone</label>
              <input
                type="tel"
                value={form.parent_phone ?? ''}
                onChange={e => set('parent_phone', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Parent email</label>
              <input
                type="email"
                value={form.parent_email ?? ''}
                onChange={e => set('parent_email', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea
                rows={3}
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
          {result?.ok && <p className="text-sm text-green-700">Saved.</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="px-4 py-2 text-sm bg-[#1B52C1] text-white rounded-lg hover:bg-[#1540a0] disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => { setOpen(false); setResult(null); setForm({ ...initial }) }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
