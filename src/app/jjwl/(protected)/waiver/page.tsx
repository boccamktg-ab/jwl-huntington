'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SEASON = '2026-2027'

export default function WaiverPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    parent_name: '',
    address: '',
    city: '',
    zip: '',
    medical_conditions: '',
    medications: '',
    emergency_contact: '',
    emergency_phone: '',
    emergency_cell: '',
    photo_consent: true,
    photo_opt_out: false,
    signature: '',
    release_agreed: false,
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.release_agreed) {
      setError('Please confirm you have read and agree to the liability release.')
      return
    }
    if (!form.signature.trim()) {
      setError('Please enter your full name as a digital signature.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/jjwl/waiver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        season: SEASON,
        parent_name: form.parent_name,
        address: form.address,
        city: form.city,
        zip: form.zip,
        medical_conditions: form.medical_conditions.trim() || null,
        medications: form.medications.trim() || null,
        emergency_contact: form.emergency_contact,
        emergency_phone: form.emergency_phone,
        emergency_cell: form.emergency_cell,
        photo_consent: !form.photo_opt_out,
        signature: form.signature,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    router.push('/jjwl/dashboard')
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Parent / Guardian Waiver</h1>
        <p className="text-sm text-gray-500 mt-1">
          {SEASON} season — must be completed before signing up for events.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Parent / Guardian */}
        <Section title="Parent / Guardian Information">
          <Field label="Parent / Guardian full name" required>
            <input type="text" required value={form.parent_name} onChange={e => set('parent_name', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Street address" required>
            <input type="text" required value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" required>
              <input type="text" required value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Zip code" required>
              <input type="text" required value={form.zip} onChange={e => set('zip', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Medical */}
        <Section title="Medical Information">
          <p className="text-sm text-gray-500">Leave blank if none. JJWL Co-Chairs will make every effort to reach you in an emergency.</p>
          <Field label="Medical condition(s)">
            <input type="text" placeholder="None" value={form.medical_conditions} onChange={e => set('medical_conditions', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Medication(s)">
            <input type="text" placeholder="None" value={form.medications} onChange={e => set('medications', e.target.value)} className={inputCls} />
          </Field>
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact">
          <Field label="Name" required>
            <input type="text" required value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input type="tel" value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Cell">
              <input type="tel" value={form.emergency_cell} onChange={e => set('emergency_cell', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Photo Consent */}
        <Section title="Photographs & Social Media">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
            <p>
              I understand that my child may be photographed while participating in JJWL events or activities and hereby give permission to use her image in JJWL authorized print, broadcast, collateral, or publicity materials. By actively signing up for and participating in projects, I give permission and authorization for my daughter to be photographed and used in JJWL authorized public materials.
            </p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={form.photo_opt_out}
              onChange={e => set('photo_opt_out', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1] focus:ring-[#1B52C1]"
            />
            <span className="text-sm text-gray-700">
              I do <strong>NOT</strong> want my child&apos;s image used in JJWL materials.
            </span>
          </label>
        </Section>

        {/* Liability Release */}
        <Section title="Liability Release">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-gray-700">
            <p>
              My child and I have carefully read this agreement and fully understand its contents. Parent or Legal Guardian does hereby covenant and agree to release and hold harmless JJWL and its Co-Chairs from and against any liability, loss, damage, claims, actions (including costs and attorney fees) for bodily injury and/or property damage, to the extent permissible by law, arising out of volunteering through the JJWL.
            </p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer mt-3">
            <input
              type="checkbox"
              required
              checked={form.release_agreed}
              onChange={e => set('release_agreed', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1] focus:ring-[#1B52C1]"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the liability release above.<span className="text-red-400 ml-0.5">*</span>
            </span>
          </label>
        </Section>

        {/* Digital Signature */}
        <Section title="Digital Signature">
          <p className="text-sm text-gray-500">Type your full legal name below. This serves as your digital signature.</p>
          <Field label="Full name of parent / guardian" required>
            <input
              type="text"
              required
              placeholder="e.g. Jane Smith"
              value={form.signature}
              onChange={e => set('signature', e.target.value)}
              className={`${inputCls} font-serif italic`}
            />
          </Field>
          <p className="text-xs text-gray-400">
            By typing your name above and submitting this form, you are signing this waiver electronically. Your signature and timestamp will be recorded.
          </p>
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !form.release_agreed}
          className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit Waiver'}
        </button>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
