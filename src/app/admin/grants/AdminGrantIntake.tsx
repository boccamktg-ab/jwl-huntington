'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type IntakeType = 'quick_add' | 'scan_first'

export default function AdminGrantIntake() {
  const router = useRouter()
  const [mode, setMode] = useState<IntakeType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    grant_type: '' as '' | 'charitable_children' | 'lift_fund',
    beneficiary_name: '',
    contact_info: '',
    admin_referrer_name: '',
    admin_referrer_org: '',
    admin_referrer_phone: '',
    admin_referrer_email: '',
    admin_notes: '',
    requested_amount: '',
  })

  function setF(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function reset() {
    setMode(null)
    setError('')
    setForm({
      grant_type: '',
      beneficiary_name: '',
      contact_info: '',
      admin_referrer_name: '',
      admin_referrer_org: '',
      admin_referrer_phone: '',
      admin_referrer_email: '',
      admin_notes: '',
      requested_amount: '',
    })
  }

  async function handleSubmit() {
    setError('')
    if (!form.grant_type) return setError('Select a program.')
    if (mode === 'scan_first') {
      const files = fileRef.current?.files
      if (!files || files.length === 0) return setError('Upload at least one scanned document.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/grants/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_type: mode,
          grant_type: form.grant_type,
          beneficiary_name: form.beneficiary_name || null,
          contact_info: form.contact_info || null,
          admin_referrer_name: form.admin_referrer_name || null,
          admin_referrer_org: form.admin_referrer_org || null,
          admin_referrer_phone: form.admin_referrer_phone || null,
          admin_referrer_email: form.admin_referrer_email || null,
          admin_notes: form.admin_notes || null,
          requested_amount: form.requested_amount ? parseFloat(form.requested_amount) : 0,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')

      // Upload scan documents if scan-first
      if (mode === 'scan_first') {
        const files = fileRef.current?.files
        if (files && files.length > 0) {
          const uploadForm = new FormData()
          uploadForm.append('application_id', json.id)
          for (const file of Array.from(files)) uploadForm.append('files', file)
          await fetch('/api/grants/documents', { method: 'POST', body: uploadForm })
        }
      }

      router.push(`/grants/reviewer/${json.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm text-gray-600 mb-1'

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      {!mode && (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setMode('quick_add')}
            className="bg-white border-2 border-gray-200 rounded-xl p-5 text-left hover:border-[#1B52C1] hover:shadow-sm transition-all group">
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-semibold text-gray-900 group-hover:text-[#1B52C1] text-sm">Quick Add</div>
            <p className="text-xs text-gray-500 mt-1">Placeholder record with minimal info. Use when you have a contact but not all the details yet.</p>
          </button>
          <button onClick={() => setMode('scan_first')}
            className="bg-white border-2 border-gray-200 rounded-xl p-5 text-left hover:border-[#1B52C1] hover:shadow-sm transition-all group">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-semibold text-gray-900 group-hover:text-[#1B52C1] text-sm">Scan-First Intake</div>
            <p className="text-xs text-gray-500 mt-1">Upload a scanned paper application with no data entry. A team member will transcribe it later.</p>
          </button>
        </div>
      )}

      {/* Quick Add form */}
      {mode === 'quick_add' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Add — Placeholder Record</h2>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">✕ Cancel</button>
          </div>

          <div>
            <label className={labelCls}>Program <span className="text-red-500">*</span></label>
            <select value={form.grant_type} onChange={e => setF('grant_type', e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              <option value="charitable_children">Charitable Children Grant</option>
              <option value="lift_fund">Lift Fund</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Applicant / Family Name</label>
              <input value={form.beneficiary_name} onChange={e => setF('beneficiary_name', e.target.value)}
                placeholder="Name or description" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Approximate Amount Requested</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={form.requested_amount} onChange={e => setF('requested_amount', e.target.value)}
                  placeholder="0" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Contact Info / Notes</label>
            <textarea value={form.contact_info} onChange={e => setF('contact_info', e.target.value)}
              rows={2} placeholder="Applicant phone, email, any relevant notes about the case…"
              className={inputCls + ' resize-none'} />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 font-medium mb-3">Referring Contact (person who contacted JWL)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Referrer Name</label>
                <input value={form.admin_referrer_name} onChange={e => setF('admin_referrer_name', e.target.value)}
                  placeholder="Full name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Organization</label>
                <input value={form.admin_referrer_org} onChange={e => setF('admin_referrer_org', e.target.value)}
                  placeholder="Agency, school, etc." className={inputCls} />
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
          </div>

          <div>
            <label className={labelCls}>Internal Notes</label>
            <textarea value={form.admin_notes} onChange={e => setF('admin_notes', e.target.value)}
              rows={2} placeholder="Any context, how they contacted JWL, urgency, etc."
              className={inputCls + ' resize-none'} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="bg-[#1B52C1] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#1540A0] disabled:opacity-50">
            {loading ? 'Creating…' : 'Create placeholder record'}
          </button>
        </div>
      )}

      {/* Scan-First form */}
      {mode === 'scan_first' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Scan-First Intake</h2>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">✕ Cancel</button>
          </div>
          <p className="text-xs text-gray-500">Upload the scanned paper application (and any supporting documents). No data entry needed now — a team member will open this record later to transcribe the details.</p>

          <div>
            <label className={labelCls}>Program <span className="text-red-500">*</span></label>
            <select value={form.grant_type} onChange={e => setF('grant_type', e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              <option value="charitable_children">Charitable Children Grant</option>
              <option value="lift_fund">Lift Fund</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Scanned Document(s) <span className="text-red-500">*</span></label>
            <p className="text-xs text-gray-400 mb-2">Upload the completed paper form and any attached supporting documents. PDF or image files. Multiple files allowed.</p>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple
              className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-[#1B52C1] hover:file:bg-blue-100" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Referrer Name (if visible on scan)</label>
              <input value={form.admin_referrer_name} onChange={e => setF('admin_referrer_name', e.target.value)}
                placeholder="From the paper form" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Organization</label>
              <input value={form.admin_referrer_org} onChange={e => setF('admin_referrer_org', e.target.value)}
                placeholder="From the paper form" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Internal Notes</label>
            <textarea value={form.admin_notes} onChange={e => setF('admin_notes', e.target.value)}
              rows={2} placeholder="How it was received, who needs to transcribe it, any urgency…"
              className={inputCls + ' resize-none'} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="bg-[#1B52C1] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#1540A0] disabled:opacity-50">
            {loading ? 'Uploading…' : 'Create record + upload scan'}
          </button>
        </div>
      )}
    </div>
  )
}
