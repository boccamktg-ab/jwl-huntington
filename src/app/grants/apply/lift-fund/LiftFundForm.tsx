'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  referrerId: string
  referrerName: string
  referrerEmail: string
}

export default function LiftFundForm({ referrerId, referrerName, referrerEmail }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    beneficiary_name: '',
    household_composition: '',
    address: '',
    attends_huntington_school: false,
    justification: '',
    crisis_description: '',
    sustainability_statement: '',
    confidential: true,
    confidentiality_notes: '',
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
      if (!form.beneficiary_name.trim()) return setError('Applicant/family name is required.')
      if (!form.address.trim()) return setError('Address is required.')
      if (!form.crisis_description.trim()) return setError('Description of the financial crisis is required.')
      if (!form.sustainability_statement.trim()) return setError('Proof of financial sustainability is required.')
      if (isNaN(amount) || amount <= 0 || amount > 3000) return setError('Requested amount must be between $1 and $3,000.')
      if (!fileRef.current?.files?.length) return setError('At least one supporting document is required for the Lift Fund.')
    }

    setSaving(true)
    try {
      // First create the application record
      const res = await fetch('/api/grants/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'lift_fund',
          status: asDraft ? 'draft' : 'submitted',
          requested_amount: isNaN(amount) ? 0 : amount,
          referrer_id: referrerId,
          details: {
            beneficiary_name: form.beneficiary_name,
            household_composition: form.household_composition,
            address: form.address,
            attends_huntington_school: form.attends_huntington_school,
            justification: form.crisis_description, // shared field used for crisis description
            crisis_description: form.crisis_description,
            sustainability_statement: form.sustainability_statement,
            confidential: form.confidential,
            confidentiality_notes: form.confidentiality_notes,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')

      // Upload documents if any
      const files = fileRef.current?.files
      if (files && files.length > 0) {
        const uploadForm = new FormData()
        uploadForm.append('application_id', json.id)
        for (const file of Array.from(files)) {
          uploadForm.append('files', file)
        }
        const uploadRes = await fetch('/api/grants/documents', {
          method: 'POST',
          body: uploadForm,
        })
        if (!uploadRes.ok) {
          const uploadJson = await uploadRes.json()
          throw new Error(uploadJson.error ?? 'Document upload failed.')
        }
      }

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

      {/* Applicant info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Applicant / Family Information</h2>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Applicant / Family Name <span className="text-red-500">*</span></label>
          <input
            value={form.beneficiary_name}
            onChange={e => set('beneficiary_name', e.target.value)}
            placeholder="Full name or family name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Household Composition</label>
          <p className="text-xs text-gray-400 mb-1">Who does this grant affect? (e.g., single parent, 2 children ages 5 and 8)</p>
          <input
            value={form.household_composition}
            onChange={e => set('household_composition', e.target.value)}
            placeholder="Describe the household"
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
            Applicant does not reside in the Town of Huntington but attends a Huntington school district school
          </span>
        </label>
      </section>

      <hr className="border-gray-100" />

      {/* Crisis & grant details */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Financial Crisis & Grant Details</h2>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Nature of the Financial Crisis <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-400 mb-1">Describe the emergency situation (medical bills, mortgage/rent, utilities, etc.).</p>
          <textarea
            value={form.crisis_description}
            onChange={e => set('crisis_description', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Proof of Financial Sustainability <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-400 mb-1">Explain how the family can sustain ongoing expenses outside of this specific crisis (income, employment, other support).</p>
          <textarea
            value={form.sustainability_statement}
            onChange={e => set('sustainability_statement', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="max-w-xs">
          <label className="block text-sm text-gray-600 mb-1">Requested Amount <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-400 mb-1">Maximum $3,000, one-time.</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="1"
              max="3000"
              step="0.01"
              value={form.requested_amount}
              onChange={e => set('requested_amount', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Documents */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Supporting Documents <span className="text-red-500">*</span></h2>
        <p className="text-xs text-gray-500">Upload financial documentation (pay stubs, bills, bank statements, etc.). PDF or image files accepted. Required for submission.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple
          className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-[#1B52C1] hover:file:bg-blue-100"
        />
      </section>

      <hr className="border-gray-100" />

      {/* Confidentiality */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Confidentiality</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.confidential}
            onChange={e => set('confidential', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1] focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            This application requires strict confidentiality. The applicant's identity should not be disclosed beyond JWL reviewers.
          </span>
        </label>
        {form.confidential && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confidentiality Notes (optional)</label>
            <textarea
              value={form.confidentiality_notes}
              onChange={e => set('confidentiality_notes', e.target.value)}
              rows={2}
              placeholder="Any specific handling instructions…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}
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
