'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type SW = { id: string; name: string; email: string; type: string }
type HouseholdMember = { full_name: string; age: string; married: boolean }

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

export default function AdminNewGrantForm({ socialWorkers }: { socialWorkers: SW[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [grantType, setGrantType] = useState<'charitable_children' | 'lift_fund' | ''>('')

  // Referrer (external)
  const [referrer, setReferrer] = useState({
    name: '', org: '', phone: '', email: '', notes: '',
  })

  // SW assignment
  const [assignedSwId, setAssignedSwId] = useState('')

  // Charitable Children fields
  const [cc, setCc] = useState({
    beneficiary_name: '', dob: '', address: '',
    attends_huntington_school: false,
    justification: '', financial_narrative: '', requested_amount: '',
  })

  // Lift Fund fields
  const [lf, setLf] = useState({
    beneficiary_name: '', address: '', applicant_phone: '', applicant_email: '',
    attends_huntington_school: false,
    housing_status: '' as '' | 'rented' | 'owned',
    residence_length: '', occupation: '', employer: '', employer_address: '',
    annual_salary: '', weekly_salary: '',
    employment_type: '' as '' | 'full_time' | 'part_time' | 'not_employed' | 'other',
    hours_per_week: '', other_assistance: '', income_expenses_narrative: '',
    crisis_description: '', presenting_problem: '', requested_amount: '',
    sustainability_statement: '',
    first_request: '' as '' | 'prior_approved' | 'prior_denied' | 'none',
    prior_request_explanation: '',
    consent_disclosure: false,
  })
  const [household, setHousehold] = useState<HouseholdMember[]>([{ full_name: '', age: '', married: false }])
  const [assistance, setAssistance] = useState<Record<AssistanceKey, { checked: boolean; amount: string }>>(
    Object.fromEntries(ASSISTANCE_ITEMS.map(i => [i.key, { checked: false, amount: '' }])) as any
  )

  function setR(f: string, v: string) { setReferrer(r => ({ ...r, [f]: v })) }
  function setCC(f: string, v: string | boolean) { setCc(c => ({ ...c, [f]: v })) }
  function setLF(f: string, v: string | boolean) { setLf(c => ({ ...c, [f]: v })) }
  function setAst(key: AssistanceKey, field: 'checked' | 'amount', val: boolean | string) {
    setAssistance(a => ({ ...a, [key]: { ...a[key], [field]: val } }))
  }
  function addMember() { setHousehold(h => [...h, { full_name: '', age: '', married: false }]) }
  function removeMember(i: number) { setHousehold(h => h.filter((_, idx) => idx !== i)) }
  function updateMember(i: number, f: keyof HouseholdMember, v: string | boolean) {
    setHousehold(h => h.map((m, idx) => idx === i ? { ...m, [f]: v } : m))
  }

  async function handleSubmit() {
    setError('')
    if (!grantType) return setError('Select a program.')
    if (!referrer.name.trim()) return setError('Referrer name is required.')

    if (grantType === 'charitable_children') {
      if (!cc.beneficiary_name.trim()) return setError('Child\'s name is required.')
      if (!cc.dob) return setError('Date of birth is required.')
      if (!cc.address.trim()) return setError('Address is required.')
      if (!cc.justification.trim()) return setError('Justification is required.')
      const amt = parseFloat(cc.requested_amount)
      if (isNaN(amt) || amt <= 0 || amt > 1000) return setError('Amount must be between $1 and $1,000.')
    } else {
      if (!lf.beneficiary_name.trim()) return setError('Applicant name is required.')
      if (!lf.address.trim()) return setError('Address is required.')
      if (!lf.crisis_description.trim()) return setError('Financial need description is required.')
      if (!lf.presenting_problem.trim()) return setError('Presenting problem is required.')
      if (!lf.consent_disclosure) return setError('Consent disclosure attestation is required.')
      const amt = parseFloat(lf.requested_amount)
      if (isNaN(amt) || amt <= 0 || amt > 3000) return setError('Amount must be between $1 and $3,000.')
    }

    setSaving(true)
    try {
      let details: Record<string, any> = {}
      let householdMembers: HouseholdMember[] = []
      let requestedAmount = 0

      if (grantType === 'charitable_children') {
        requestedAmount = parseFloat(cc.requested_amount)
        details = {
          beneficiary_name: cc.beneficiary_name,
          dob: cc.dob || null,
          address: cc.address,
          attends_huntington_school: cc.attends_huntington_school,
          justification: cc.justification,
          financial_narrative: cc.financial_narrative,
        }
      } else {
        requestedAmount = parseFloat(lf.requested_amount)
        const assistanceDetails = Object.fromEntries(
          ASSISTANCE_ITEMS.flatMap(({ key }) => [
            [`assistance_${key}`, assistance[key].checked],
            [`assistance_${key}_amt`, assistance[key].checked ? assistance[key].amount : null],
          ])
        )
        details = {
          beneficiary_name: lf.beneficiary_name,
          address: lf.address,
          applicant_phone: lf.applicant_phone,
          applicant_email: lf.applicant_email,
          attends_huntington_school: lf.attends_huntington_school,
          housing_status: lf.housing_status || null,
          residence_length: lf.residence_length,
          occupation: lf.occupation,
          employer: lf.employer,
          employer_address: lf.employer_address,
          annual_salary: lf.annual_salary,
          weekly_salary: lf.weekly_salary,
          employment_type: lf.employment_type || null,
          hours_per_week: lf.hours_per_week,
          other_assistance: lf.other_assistance,
          income_expenses_narrative: lf.income_expenses_narrative,
          crisis_description: lf.crisis_description,
          justification: lf.crisis_description,
          presenting_problem: lf.presenting_problem,
          sustainability_statement: lf.sustainability_statement,
          first_request: lf.first_request === '' ? null : lf.first_request === 'none',
          prior_request_explanation: (lf.first_request === 'prior_approved' || lf.first_request === 'prior_denied') ? lf.prior_request_explanation : null,
          confidential: true,
          consent_disclosure: lf.consent_disclosure,
          ...assistanceDetails,
        }
        householdMembers = household.filter(m => m.full_name.trim())
      }

      const res = await fetch('/api/grants/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_type: 'full_form',
          grant_type: grantType,
          requested_amount: requestedAmount,
          admin_referrer_name: referrer.name,
          admin_referrer_org: referrer.org || null,
          admin_referrer_phone: referrer.phone || null,
          admin_referrer_email: referrer.email || null,
          admin_notes: referrer.notes || null,
          assigned_sw_id: assignedSwId || null,
          details,
          household_members: householdMembers,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')

      // Upload any documents
      const files = fileRef.current?.files
      if (files && files.length > 0) {
        const uploadForm = new FormData()
        uploadForm.append('application_id', json.id)
        for (const file of Array.from(files)) uploadForm.append('files', file)
        await fetch('/api/grants/documents', { method: 'POST', body: uploadForm })
      }

      router.push(`/grants/reviewer/${json.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm text-gray-600 mb-1'
  const req = <span className="text-red-500">*</span>

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-8">

      {/* Program selector */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Program <span className="text-red-500">*</span></h2>
        <div className="grid grid-cols-2 gap-4">
          {([
            { value: 'charitable_children', label: 'Charitable Children Grant', desc: 'Up to $1,000 lifetime per child' },
            { value: 'lift_fund', label: 'Lift Fund', desc: 'Up to $3,000 one-time emergency aid' },
          ] as const).map(opt => (
            <button key={opt.value} type="button" onClick={() => setGrantType(opt.value)}
              className={`text-left border-2 rounded-xl p-4 transition-all ${grantType === opt.value ? 'border-[#1B52C1] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {grantType && (
        <>
          <hr className="border-gray-100" />

          {/* External referrer */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Referring Contact</h2>
            <p className="text-xs text-gray-500">The person who contacted JWL (by phone, email, or in person). This does not need to be a portal user.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name {req}</label>
                <input value={referrer.name} onChange={e => setR('name', e.target.value)}
                  placeholder="Full name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Organization</label>
                <input value={referrer.org} onChange={e => setR('org', e.target.value)}
                  placeholder="Agency, school, hospital, etc." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input value={referrer.phone} onChange={e => setR('phone', e.target.value)}
                  placeholder="(631) 555-0100" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input value={referrer.email} onChange={e => setR('email', e.target.value)}
                  placeholder="referrer@org.com" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Internal Notes</label>
              <textarea value={referrer.notes} onChange={e => setR('notes', e.target.value)}
                rows={2} placeholder="How they contacted JWL, any context, urgency…"
                className={inputCls + ' resize-none'} />
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* SW assignment */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assign to Social Worker</h2>
            <p className="text-xs text-gray-500">Optional. The assigned SW will see this application in their grants dashboard and can message the reviewer, upload documents, and track status.</p>
            <select value={assignedSwId} onChange={e => setAssignedSwId(e.target.value)} className={inputCls}>
              <option value="">— No assignment (admin manages) —</option>
              {socialWorkers.map(sw => (
                <option key={sw.id} value={sw.id}>
                  {sw.name} ({sw.type === 'school' ? 'School' : 'Community'}) — {sw.email}
                </option>
              ))}
            </select>
          </section>

          <hr className="border-gray-100" />

          {/* Charitable Children fields */}
          {grantType === 'charitable_children' && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Child Information</h2>
              <div>
                <label className={labelCls}>Child's Full Name {req}</label>
                <input value={cc.beneficiary_name} onChange={e => setCC('beneficiary_name', e.target.value)}
                  placeholder="First and last name" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date of Birth {req}</label>
                  <input type="date" value={cc.dob} onChange={e => setCC('dob', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Home Address {req}</label>
                <input value={cc.address} onChange={e => setCC('address', e.target.value)}
                  placeholder="Street, City, NY ZIP" className={inputCls} />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={cc.attends_huntington_school}
                  onChange={e => setCC('attends_huntington_school', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
                <span className="text-sm text-gray-600">Does not reside in Town of Huntington but attends a Huntington school district school</span>
              </label>
              <div>
                <label className={labelCls}>Justification {req}</label>
                <p className="text-xs text-gray-400 mb-1">How will this grant benefit the child's welfare, education, or health?</p>
                <textarea value={cc.justification} onChange={e => setCC('justification', e.target.value)}
                  rows={4} className={inputCls + ' resize-none'} />
              </div>
              <div>
                <label className={labelCls}>Family's Financial Situation</label>
                <textarea value={cc.financial_narrative} onChange={e => setCC('financial_narrative', e.target.value)}
                  rows={3} placeholder="Brief narrative of financial need (optional)" className={inputCls + ' resize-none'} />
              </div>
              <div className="max-w-xs">
                <label className={labelCls}>Requested Amount {req}</label>
                <p className="text-xs text-gray-400 mb-1">Maximum $1,000 lifetime per child.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="1" max="1000" step="0.01"
                    value={cc.requested_amount} onChange={e => setCC('requested_amount', e.target.value)}
                    placeholder="0.00" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </section>
          )}

          {/* Lift Fund fields */}
          {grantType === 'lift_fund' && (
            <>
              {/* Household */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Household Members</h2>
                  <button type="button" onClick={addMember} className="text-xs text-[#1B52C1] hover:underline">+ Add member</button>
                </div>
                {household.map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      {i === 0 && <label className={labelCls}>Full Name</label>}
                      <input value={m.full_name} onChange={e => updateMember(i, 'full_name', e.target.value)}
                        placeholder="Full name" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      {i === 0 && <label className={labelCls}>Age</label>}
                      <input value={m.age} onChange={e => updateMember(i, 'age', e.target.value)}
                        placeholder="Age" className={inputCls} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2 pt-1">
                      {i === 0 && <div className="invisible text-sm mb-1">-</div>}
                      <input type="checkbox" checked={m.married} onChange={e => updateMember(i, 'married', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
                      <span className="text-sm text-gray-600">Married</span>
                    </div>
                    {household.length > 1 && (
                      <div className={`col-span-2 ${i === 0 ? 'pt-5' : ''}`}>
                        <button type="button" onClick={() => removeMember(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    )}
                  </div>
                ))}
              </section>

              <hr className="border-gray-100" />

              {/* Applicant info */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Applicant Information</h2>
                <div>
                  <label className={labelCls}>Applicant / Family Name {req}</label>
                  <input value={lf.beneficiary_name} onChange={e => setLF('beneficiary_name', e.target.value)}
                    placeholder="Full name or family name" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input value={lf.applicant_phone} onChange={e => setLF('applicant_phone', e.target.value)}
                      placeholder="(631) 555-0100" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input value={lf.applicant_email} onChange={e => setLF('applicant_email', e.target.value)}
                      placeholder="applicant@email.com" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Home Address {req}</label>
                  <input value={lf.address} onChange={e => setLF('address', e.target.value)}
                    placeholder="Street address, Town, NY ZIP" className={inputCls} />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={lf.attends_huntington_school}
                    onChange={e => setLF('attends_huntington_school', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
                  <span className="text-sm text-gray-600">Does not reside in Town of Huntington but attends a Huntington school district school</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Housing Status</label>
                    <select value={lf.housing_status} onChange={e => setLF('housing_status', e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option value="rented">Rented</option>
                      <option value="owned">Owned</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Length of Time at Residence</label>
                    <input value={lf.residence_length} onChange={e => setLF('residence_length', e.target.value)}
                      placeholder="e.g., 3 years" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Occupation</label>
                    <input value={lf.occupation} onChange={e => setLF('occupation', e.target.value)}
                      placeholder="Job title or N/A" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Employment Type</label>
                    <select value={lf.employment_type} onChange={e => setLF('employment_type', e.target.value)} className={inputCls}>
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
                    <input value={lf.employer} onChange={e => setLF('employer', e.target.value)}
                      placeholder="Employer name or N/A" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Annual Salary</label>
                    <input value={lf.annual_salary} onChange={e => setLF('annual_salary', e.target.value)}
                      placeholder="e.g., $45,000 or N/A" className={inputCls} />
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* Public Assistance */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Public Assistance Received</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ASSISTANCE_ITEMS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <input type="checkbox" checked={assistance[key].checked}
                        onChange={e => setAst(key, 'checked', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#1B52C1] shrink-0" />
                      <span className="text-sm text-gray-700 w-24 shrink-0">{label}</span>
                      {assistance[key].checked && (
                        <input value={assistance[key].amount} onChange={e => setAst(key, 'amount', e.target.value)}
                          placeholder="$ / month"
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28" />
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <label className={labelCls}>Other Assistance</label>
                  <textarea value={lf.other_assistance} onChange={e => setLF('other_assistance', e.target.value)}
                    rows={2} placeholder="Other financial help from relatives, agencies, churches, etc."
                    className={inputCls + ' resize-none'} />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* Income / Need / Problem */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Financial Need</h2>
                <div>
                  <label className={labelCls}>Monthly Income &amp; Expenses</label>
                  <textarea value={lf.income_expenses_narrative} onChange={e => setLF('income_expenses_narrative', e.target.value)}
                    rows={4} placeholder="Detailed narrative of monthly income sources and expenses…"
                    className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className={labelCls}>Description of Financial Need {req}</label>
                  <textarea value={lf.crisis_description} onChange={e => setLF('crisis_description', e.target.value)}
                    rows={4} placeholder="Describe the specific need and what funds would cover…"
                    className={inputCls + ' resize-none'} />
                </div>
                <div className="max-w-xs">
                  <label className={labelCls}>Requested Amount {req}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min="1" max="3000" step="0.01"
                      value={lf.requested_amount} onChange={e => setLF('requested_amount', e.target.value)}
                      placeholder="0.00" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Presenting Problem {req}</label>
                  <p className="text-xs text-gray-400 mb-1">Why can't the need be met otherwise? How does this grant support future self-sufficiency?</p>
                  <textarea value={lf.presenting_problem} onChange={e => setLF('presenting_problem', e.target.value)}
                    rows={4} className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className={labelCls}>Financial Sustainability</label>
                  <textarea value={lf.sustainability_statement} onChange={e => setLF('sustainability_statement', e.target.value)}
                    rows={3} placeholder="How will the family sustain expenses beyond this crisis?" className={inputCls + ' resize-none'} />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* Prior requests */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Prior Requests</h2>
                <div>
                  <label className={labelCls}>Is this the applicant's first request from JWL?</label>
                  <div className="flex flex-col gap-2 mt-1">
                    {([
                      { value: 'prior_approved', label: 'Yes — approved' },
                      { value: 'prior_denied', label: 'Yes — denied' },
                      { value: 'none', label: 'No Prior Requests' },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="first_request" value={value}
                          checked={lf.first_request === value} onChange={() => setLF('first_request', value)}
                          className="h-4 w-4 border-gray-300 text-[#1B52C1]" />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {(lf.first_request === 'prior_approved' || lf.first_request === 'prior_denied') && (
                  <div>
                    <label className={labelCls}>Explain prior request {req}</label>
                    <textarea value={lf.prior_request_explanation} onChange={e => setLF('prior_request_explanation', e.target.value)}
                      rows={3} className={inputCls + ' resize-none'} />
                  </div>
                )}
              </section>

              <hr className="border-gray-100" />

              {/* Documents */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Supporting Documents</h2>
                <p className="text-xs text-gray-500">Bills, pay stubs, bank statements, etc. PDF or image files. Multiple files allowed.</p>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple
                  className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-[#1B52C1] hover:file:bg-blue-100" />
              </section>

              <hr className="border-gray-100" />

              {/* Consent */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Consent</h2>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={lf.consent_disclosure} onChange={e => setLF('consent_disclosure', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
                  <span className="text-sm text-gray-600">
                    {req} The applicant has been advised that JWL Huntington may communicate with any agency or individual necessary to process this application.
                  </span>
                </label>
              </section>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          <button type="button" onClick={handleSubmit} disabled={saving}
            className="w-full bg-[#1B52C1] text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-[#1540A0] disabled:opacity-50">
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>
        </>
      )}
    </div>
  )
}
