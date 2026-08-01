'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type HouseholdMember = { full_name: string; age: string; married: boolean }

type Props = {
  referrerId: string
  referrerName: string
  referrerEmail: string
}

const ASSISTANCE_ITEMS = [
  { key: 'medicaid', label: 'Medicaid' },
  { key: 'adc', label: 'ADC' },
  { key: 'snap', label: 'SNAP' },
  { key: 'wic', label: 'WIC' },
  { key: 'ssi', label: 'SSI' },
  { key: 'unemployment', label: 'Unemployment' },
  { key: 'section8', label: 'Section 8' },
  { key: 'heap', label: 'HEAP' },
] as const

type AssistanceKey = typeof ASSISTANCE_ITEMS[number]['key']

export default function LiftFundForm({ referrerId, referrerName, referrerEmail }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Household members
  const [household, setHousehold] = useState<HouseholdMember[]>([{ full_name: '', age: '', married: false }])

  // Main form
  const [form, setForm] = useState({
    beneficiary_name: '',
    address: '',
    attends_huntington_school: false,
    applicant_phone: '',
    applicant_email: '',
    housing_status: '' as '' | 'rented' | 'owned',
    residence_length: '',
    occupation: '',
    employer: '',
    employer_address: '',
    annual_salary: '',
    weekly_salary: '',
    employment_type: '' as '' | 'full_time' | 'part_time' | 'not_employed' | 'other',
    hours_per_week: '',
    other_assistance: '',
    income_expenses_narrative: '',
    crisis_description: '',
    presenting_problem: '',
    requested_amount: '',
    sustainability_statement: '',
    first_request: '' as '' | 'prior_approved' | 'prior_denied' | 'none',
    prior_request_explanation: '',
    confidential: true,
    confidentiality_notes: '',
    consent_disclosure: false,
  })

  // Public assistance
  const [assistance, setAssistance] = useState<Record<AssistanceKey, { checked: boolean; amount: string }>>(
    Object.fromEntries(ASSISTANCE_ITEMS.map(i => [i.key, { checked: false, amount: '' }])) as any
  )

  function setF(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setAssistanceField(key: AssistanceKey, field: 'checked' | 'amount', value: boolean | string) {
    setAssistance(a => ({ ...a, [key]: { ...a[key], [field]: value } }))
  }

  function addHouseholdMember() {
    setHousehold(h => [...h, { full_name: '', age: '', married: false }])
  }

  function removeHouseholdMember(i: number) {
    setHousehold(h => h.filter((_, idx) => idx !== i))
  }

  function updateHouseholdMember(i: number, field: keyof HouseholdMember, value: string | boolean) {
    setHousehold(h => h.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  async function handleSubmit(asDraft: boolean) {
    setError('')

    const amount = parseFloat(form.requested_amount)
    if (!asDraft) {
      if (!form.beneficiary_name.trim()) return setError('Applicant/family name is required.')
      if (!form.address.trim()) return setError('Address is required.')
      if (!form.crisis_description.trim()) return setError('Description of the presenting need is required.')
      if (!form.presenting_problem.trim()) return setError('Presenting problem is required.')
      if (!form.consent_disclosure) return setError('Consent disclosure attestation is required.')
      if (isNaN(amount) || amount <= 0 || amount > 3000) return setError('Requested amount must be between $1 and $3,000.')
    }

    setSaving(true)
    try {
      const assistanceDetails = Object.fromEntries(
        ASSISTANCE_ITEMS.flatMap(({ key }) => [
          [`assistance_${key}`, assistance[key].checked],
          [`assistance_${key}_amt`, assistance[key].checked ? assistance[key].amount : null],
        ])
      )

      const res = await fetch('/api/grants/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'lift_fund',
          status: asDraft ? 'draft' : 'submitted',
          requested_amount: isNaN(amount) ? 0 : amount,
          referrer_id: referrerId,
          household_members: household.filter(h => h.full_name.trim()),
          details: {
            beneficiary_name: form.beneficiary_name,
            address: form.address,
            attends_huntington_school: form.attends_huntington_school,
            applicant_phone: form.applicant_phone,
            applicant_email: form.applicant_email,
            housing_status: form.housing_status || null,
            residence_length: form.residence_length,
            occupation: form.occupation,
            employer: form.employer,
            employer_address: form.employer_address,
            annual_salary: form.annual_salary,
            weekly_salary: form.weekly_salary,
            employment_type: form.employment_type || null,
            hours_per_week: form.hours_per_week,
            other_assistance: form.other_assistance,
            income_expenses_narrative: form.income_expenses_narrative,
            crisis_description: form.crisis_description,
            justification: form.crisis_description,
            presenting_problem: form.presenting_problem,
            sustainability_statement: form.sustainability_statement,
            first_request: form.first_request === '' ? null : form.first_request === 'none',
            prior_request_explanation: (form.first_request === 'prior_approved' || form.first_request === 'prior_denied') ? form.prior_request_explanation : null,
            confidential: form.confidential,
            confidentiality_notes: form.confidentiality_notes,
            consent_disclosure: form.consent_disclosure,
            ...assistanceDetails,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')

      const files = fileRef.current?.files
      if (files && files.length > 0) {
        const uploadForm = new FormData()
        uploadForm.append('application_id', json.id)
        for (const file of Array.from(files)) uploadForm.append('files', file)
        const uploadRes = await fetch('/api/grants/documents', { method: 'POST', body: uploadForm })
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

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm text-gray-600 mb-1'
  const reqStar = <span className="text-red-500">*</span>

  return (
    <form className="bg-white rounded-xl border border-gray-200 p-6 space-y-8" onSubmit={e => e.preventDefault()}>

      {/* Referrer */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Referrer Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input value={referrerName} disabled className={inputCls + ' bg-gray-50 text-gray-500'} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={referrerEmail} disabled className={inputCls + ' bg-gray-50 text-gray-500'} />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Household */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Household Members</h2>
          <button type="button" onClick={addHouseholdMember}
            className="text-xs text-[#1B52C1] hover:underline">+ Add member</button>
        </div>
        <p className="text-xs text-gray-400">List all members of the household. Name is required for each row you add.</p>
        {household.map((m, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              {i === 0 && <label className={labelCls}>Full Name</label>}
              <input value={m.full_name} onChange={e => updateHouseholdMember(i, 'full_name', e.target.value)}
                placeholder="Full name" className={inputCls} />
            </div>
            <div className="col-span-2">
              {i === 0 && <label className={labelCls}>Age</label>}
              <input value={m.age} onChange={e => updateHouseholdMember(i, 'age', e.target.value)}
                placeholder="Age" className={inputCls} />
            </div>
            <div className="col-span-3 flex items-center gap-2 pt-1">
              {i === 0 && <div className="invisible text-sm mb-1">-</div>}
              <input type="checkbox" checked={m.married} onChange={e => updateHouseholdMember(i, 'married', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
              <span className="text-sm text-gray-600">Married</span>
            </div>
            {household.length > 1 && (
              <div className={`col-span-2 ${i === 0 ? 'pt-5' : ''}`}>
                <button type="button" onClick={() => removeHouseholdMember(i)}
                  className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
            )}
          </div>
        ))}
      </section>

      <hr className="border-gray-100" />

      {/* Applicant Info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Applicant Information</h2>

        <div>
          <label className={labelCls}>Applicant / Family Name {reqStar}</label>
          <input value={form.beneficiary_name} onChange={e => setF('beneficiary_name', e.target.value)}
            placeholder="Full name or family name" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.applicant_phone} onChange={e => setF('applicant_phone', e.target.value)}
              placeholder="(631) 555-0100" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={form.applicant_email} onChange={e => setF('applicant_email', e.target.value)}
              placeholder="applicant@email.com" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Home Address {reqStar}</label>
          <input value={form.address} onChange={e => setF('address', e.target.value)}
            placeholder="Street address, Town, NY ZIP" className={inputCls} />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.attends_huntington_school}
            onChange={e => setF('attends_huntington_school', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
          <span className="text-sm text-gray-600">
            Applicant does not reside in Town of Huntington but attends a Huntington school district school
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Housing Status</label>
            <select value={form.housing_status} onChange={e => setF('housing_status', e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              <option value="rented">Rented</option>
              <option value="owned">Owned</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Length of Time at Residence</label>
            <input value={form.residence_length} onChange={e => setF('residence_length', e.target.value)}
              placeholder="e.g., 3 years" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Occupation</label>
            <input value={form.occupation} onChange={e => setF('occupation', e.target.value)}
              placeholder="Job title or N/A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Employment Type</label>
            <select value={form.employment_type} onChange={e => setF('employment_type', e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="not_employed">Not employed</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Employer</label>
            <input value={form.employer} onChange={e => setF('employer', e.target.value)}
              placeholder="Employer name or N/A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hours Worked per Week</label>
            <input value={form.hours_per_week} onChange={e => setF('hours_per_week', e.target.value)}
              placeholder="e.g., 40 or N/A" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Employer Address</label>
          <input value={form.employer_address} onChange={e => setF('employer_address', e.target.value)}
            placeholder="Street, City, NY ZIP" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Annual Salary</label>
            <input value={form.annual_salary} onChange={e => setF('annual_salary', e.target.value)}
              placeholder="e.g., $45,000 or N/A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Weekly Salary</label>
            <input value={form.weekly_salary} onChange={e => setF('weekly_salary', e.target.value)}
              placeholder="e.g., $865 or N/A" className={inputCls} />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Public Assistance */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Public Assistance Received</h2>
        <p className="text-xs text-gray-400">Check all that apply and enter the monthly dollar amount for each.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ASSISTANCE_ITEMS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input type="checkbox"
                checked={assistance[key].checked}
                onChange={e => setAssistanceField(key, 'checked', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#1B52C1] shrink-0" />
              <span className="text-sm text-gray-700 w-24 shrink-0">{label}</span>
              {assistance[key].checked && (
                <input value={assistance[key].amount}
                  onChange={e => setAssistanceField(key, 'amount', e.target.value)}
                  placeholder="$ / month"
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28" />
              )}
            </div>
          ))}
        </div>

        <div>
          <label className={labelCls}>Other Assistance</label>
          <p className="text-xs text-gray-400 mb-1">Financial help from relatives, service agencies, churches, etc.</p>
          <textarea value={form.other_assistance} onChange={e => setF('other_assistance', e.target.value)}
            rows={3} placeholder="Describe any other assistance received and approximate amounts…"
            className={inputCls + ' resize-none'} />
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Income / Expenses */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Monthly Income &amp; Expenses</h2>
        <p className="text-xs text-gray-400">Provide a detailed narrative of all monthly income sources and expenses. Attach supplementary documents using the document section below if needed.</p>
        <textarea value={form.income_expenses_narrative} onChange={e => setF('income_expenses_narrative', e.target.value)}
          rows={5} placeholder="Describe monthly income and expenses in detail…"
          className={inputCls + ' resize-none'} />
      </section>

      <hr className="border-gray-100" />

      {/* Distinct Financial Need */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Distinct Financial Need</h2>

        <div>
          <label className={labelCls}>Description of Financial Need {reqStar}</label>
          <p className="text-xs text-gray-400 mb-1">Describe the specific need (medical bills, overdue rent/mortgage, utility shutoff, etc.). Attach the supporting bill or statement in the documents section — it should show the payee name, payee address, and account number.</p>
          <textarea value={form.crisis_description} onChange={e => setF('crisis_description', e.target.value)}
            rows={4} placeholder="Describe the specific financial need and what the funds would cover…"
            className={inputCls + ' resize-none'} />
        </div>

        <div className="max-w-xs">
          <label className={labelCls}>Specific Dollar Amount Requested {reqStar}</label>
          <p className="text-xs text-gray-400 mb-1">Maximum $3,000, one-time.</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input type="number" min="1" max="3000" step="0.01"
              value={form.requested_amount} onChange={e => setF('requested_amount', e.target.value)}
              placeholder="0.00" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
          A supporting document is required showing the payee name, payee address, and account number. Please attach it in the Documents section below.
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Presenting Problem */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Presenting Problem</h2>
        <p className="text-xs text-gray-400">Explain why the financial need cannot be met otherwise and how JWL's assistance supports the family's future self-sufficiency.</p>
        <textarea value={form.presenting_problem} onChange={e => setF('presenting_problem', e.target.value)}
          rows={4} placeholder="Why can't this need be met otherwise? How does this grant support future self-sufficiency?"
          className={inputCls + ' resize-none'} />
      </section>

      <hr className="border-gray-100" />

      {/* First Request */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Prior Requests</h2>
        <div>
          <label className={labelCls}>Is this the applicant's first request from JWL? {reqStar}</label>
          <div className="flex flex-col gap-2 mt-1">
            {([
              { value: 'prior_approved', label: 'Yes — approved' },
              { value: 'prior_denied', label: 'Yes — denied' },
              { value: 'none', label: 'No Prior Requests' },
            ] as const).map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="first_request" value={value}
                  checked={form.first_request === value}
                  onChange={() => setF('first_request', value)}
                  className="h-4 w-4 border-gray-300 text-[#1B52C1]" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
        {form.first_request === 'prior_approved' || form.first_request === 'prior_denied' && (
          <div>
            <label className={labelCls}>Please explain the prior request {reqStar}</label>
            <textarea value={form.prior_request_explanation} onChange={e => setF('prior_request_explanation', e.target.value)}
              rows={3} placeholder="Describe any prior requests or awards from JWL…"
              className={inputCls + ' resize-none'} />
          </div>
        )}
        {form.first_request === 'prior_approved' || form.first_request === 'prior_denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
            The Lift Fund is a one-time grant. A prior request will be flagged for the reviewer, who will determine whether an exception applies.
          </div>
        )}
      </section>

      <hr className="border-gray-100" />

      {/* Documents */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Supporting Documents</h2>
        <p className="text-xs text-gray-500">Upload financial documentation (bills showing payee/address/account, pay stubs, bank statements, award letters, etc.). PDF or image files accepted. Multiple files allowed. You may also add documents after the initial application.</p>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple
          className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-[#1B52C1] hover:file:bg-blue-100" />
      </section>

      <hr className="border-gray-100" />

      {/* Proof of sustainability */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Financial Sustainability</h2>
        <p className="text-xs text-gray-400">Explain how the family can sustain ongoing expenses outside of this specific crisis (income, employment, other support).</p>
        <textarea value={form.sustainability_statement} onChange={e => setF('sustainability_statement', e.target.value)}
          rows={4} placeholder="How will the family sustain their expenses beyond this crisis?"
          className={inputCls + ' resize-none'} />
      </section>

      <hr className="border-gray-100" />

      {/* Confidentiality */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Confidentiality</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.confidential}
            onChange={e => setF('confidential', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
          <span className="text-sm text-gray-600">
            This application requires strict confidentiality. The applicant's identity should not be disclosed beyond JWL reviewers.
          </span>
        </label>
        {form.confidential && (
          <div>
            <label className={labelCls}>Confidentiality Notes (optional)</label>
            <textarea value={form.confidentiality_notes} onChange={e => setF('confidentiality_notes', e.target.value)}
              rows={2} placeholder="Any specific handling instructions…"
              className={inputCls + ' resize-none'} />
          </div>
        )}
      </section>

      <hr className="border-gray-100" />

      {/* Attestation */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Attestation &amp; Consent</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 text-sm text-gray-700 leading-relaxed">
          By submitting this application, the referrer attests that the information provided is accurate and complete to the best of their knowledge.
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.consent_disclosure}
            onChange={e => setF('consent_disclosure', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
          <span className="text-sm text-gray-600">
            {reqStar} The applicant has been advised that JWL Huntington may communicate with any agency or individual necessary to process this application.
          </span>
        </label>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={() => handleSubmit(false)} disabled={saving}
          className="bg-[#1B52C1] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#1540A0] disabled:opacity-50">
          {saving ? 'Submitting…' : 'Submit Application'}
        </button>
        <button type="button" onClick={() => handleSubmit(true)} disabled={saving}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
          Save as Draft
        </button>
      </div>
    </form>
  )
}
