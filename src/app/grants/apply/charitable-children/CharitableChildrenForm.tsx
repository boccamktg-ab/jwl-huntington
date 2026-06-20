'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  referrerId: string
  referrerName: string
  referrerEmail: string
}

export default function CharitableChildrenForm({ referrerId, referrerName, referrerEmail }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    beneficiary_name: '',
    dob: '',
    address: '',
    attends_huntington_school: false,
    justification: '',
    financial_narrative: '',
    requested_amount: '',
  })

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault()
    setError('')

    const amount = parseFloat(form.requested_amount)
    if (!asDraft) {
      if (!form.beneficiary_name.trim()) return setError('Child\'s name is required.')
      if (!form.dob) return setError('Date of birth is required.')
      if (!form.address.trim()) return setError('Address is required.')
      if (!form.justification.trim()) return setError('Justification is required.')
      if (isNaN(amount) || amount <= 0 || amount > 1000) return setError('Requested amount must be between $1 and $1,000.')
    }

    setSaving(true)
    try {
      const res = await fetch('/api/grants/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'charitable_children',
          status: asDraft ? 'draft' : 'submitted',
          requested_amount: isNaN(amount) ? 0 : amount,
          referrer_id: referrerId,
          details: {
            beneficiary_name: form.beneficiary_name,
            dob: form.dob || null,
            address: form.address,
            attends_huntington_school: form.attends_huntington_school,
            justification: form.justification,
            financial_narrative: form.financial_narrative,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      router.push(`/grants/${json.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

      {/* Referrer info (read-only) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Referrer Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input value={referrerName} disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input value={referrerEmail} disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Child info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Child Information</h2>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Child's Full Name <span className="text-red-500">*</span></label>
          <input
            value={form.beneficiary_name}
            onChange={e => set('beneficiary_name', e.target.value)}
            placeholder="First and last name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Date of Birth <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={form.dob}
            onChange={e => set('dob', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Home Address <span className="text-red-500">*</span></label>
          <input
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Street, City, NY ZIP"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.attends_huntington_school}
            onChange={e => set('attends_huntington_school', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1] focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            Child does not reside in the Town of Huntington but attends a Huntington school district school
          </span>
        </label>
      </section>

      <hr className="border-gray-100" />

      {/* Grant details */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Grant Details</h2>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Reason / Justification <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-400 mb-1">Describe how this grant will directly benefit the child's welfare, education, or health.</p>
          <textarea
            value={form.justification}
            onChange={e => set('justification', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Family's Financial Situation</label>
          <p className="text-xs text-gray-400 mb-1">Brief narrative of the family's financial need. Documentation is not required.</p>
          <textarea
            value={form.financial_narrative}
            onChange={e => set('financial_narrative', e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="max-w-xs">
          <label className="block text-sm text-gray-600 mb-1">Requested Amount <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-400 mb-1">Maximum $1,000 (lifetime per child, cumulative).</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="1"
              max="1000"
              step="0.01"
              value={form.requested_amount}
              onChange={e => set('requested_amount', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={e => handleSubmit(e, false)}
          disabled={saving}
          className="bg-[#1B52C1] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#1540A0] disabled:opacity-50"
        >
          {saving ? 'Submitting…' : 'Submit Application'}
        </button>
        <button
          type="button"
          onClick={e => handleSubmit(e, true)}
          disabled={saving}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Save as Draft
        </button>
      </div>
    </form>
  )
}
