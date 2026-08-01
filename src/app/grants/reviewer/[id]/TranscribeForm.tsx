'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

type HouseholdMember = { full_name: string; age: string; married: boolean }

type Props = {
  applicationId: string
  grantType: 'charitable_children' | 'lift_fund'
  initialDetail: any
  initialHousehold: any[]
}

export default function TranscribeForm({ applicationId, grantType, initialDetail: d, initialHousehold }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isLift = grantType === 'lift_fund'

  // Shared
  const [beneficiary_name, setBeneficiaryName] = useState(d?.beneficiary_name ?? '')
  const [address, setAddress] = useState(d?.address ?? '')
  const [attends_huntington_school, setAttendsHuntington] = useState(d?.attends_huntington_school ?? false)
  const [requested_amount, setRequestedAmount] = useState(String(d?.requested_amount ?? ''))
  const [dob, setDob] = useState(d?.dob ?? '')

  // Charitable Children
  const [justification, setJustification] = useState(d?.justification ?? '')
  const [financial_narrative, setFinancialNarrative] = useState(d?.financial_narrative ?? '')

  // Lift Fund applicant
  const [applicant_phone, setApplicantPhone] = useState(d?.applicant_phone ?? '')
  const [applicant_email, setApplicantEmail] = useState(d?.applicant_email ?? '')
  const [housing_status, setHousingStatus] = useState(d?.housing_status ?? '')
  const [residence_length, setResidenceLength] = useState(d?.residence_length ?? '')
  const [occupation, setOccupation] = useState(d?.occupation ?? '')
  const [employer, setEmployer] = useState(d?.employer ?? '')
  const [employer_address, setEmployerAddress] = useState(d?.employer_address ?? '')
  const [employment_type, setEmploymentType] = useState(d?.employment_type ?? '')
  const [hours_per_week, setHoursPerWeek] = useState(d?.hours_per_week ?? '')
  const [annual_salary, setAnnualSalary] = useState(d?.annual_salary ?? '')
  const [weekly_salary, setWeeklySalary] = useState(d?.weekly_salary ?? '')
  const [other_assistance, setOtherAssistance] = useState(d?.other_assistance ?? '')
  const [income_expenses_narrative, setIncomeExpenses] = useState(d?.income_expenses_narrative ?? '')
  const [crisis_description, setCrisisDescription] = useState(d?.crisis_description ?? d?.justification ?? '')
  const [presenting_problem, setPresentingProblem] = useState(d?.presenting_problem ?? '')
  const [sustainability_statement, setSustainability] = useState(d?.sustainability_statement ?? '')
  const [first_request, setFirstRequest] = useState<'yes' | 'no' | 'no_prior' | ''>(
    d?.first_request === true ? 'yes' : d?.first_request === false ? 'no' : ''
  )
  const [prior_request_explanation, setPriorExplanation] = useState(d?.prior_request_explanation ?? '')
  const [confidential, setConfidential] = useState(d?.confidential ?? false)
  const [confidentiality_notes, setConfidentialityNotes] = useState(d?.confidentiality_notes ?? '')
  const [consent_disclosure, setConsentDisclosure] = useState(d?.consent_disclosure ?? false)

  const [assistance, setAssistance] = useState<Record<AssistanceKey, { checked: boolean; amount: string }>>(
    Object.fromEntries(ASSISTANCE_ITEMS.map(({ key }) => [
      key,
      { checked: !!(d as any)?.[`assistance_${key}`], amount: (d as any)?.[`assistance_${key}_amt`] ?? '' }
    ])) as any
  )

  const [household, setHousehold] = useState<HouseholdMember[]>(
    initialHousehold.length > 0
      ? initialHousehold.map((m: any) => ({ full_name: m.full_name, age: String(m.age ?? ''), married: m.married }))
      : [{ full_name: '', age: '', married: false }]
  )

  function setAst(key: AssistanceKey, field: 'checked' | 'amount', val: boolean | string) {
    setAssistance(a => ({ ...a, [key]: { ...a[key], [field]: val } }))
  }
  function addMember() { setHousehold(h => [...h, { full_name: '', age: '', married: false }]) }
  function removeMember(i: number) { setHousehold(h => h.filter((_, idx) => idx !== i)) }
  function updateMember(i: number, f: keyof HouseholdMember, v: string | boolean) {
    setHousehold(h => h.map((m, idx) => idx === i ? { ...m, [f]: v } : m))
  }

  async function handleSave(submit: boolean) {
    setError('')
    if (!beneficiary_name.trim()) return setError('Beneficiary name is required.')
    if (!address.trim()) return setError('Address is required.')
    if (isLift && !crisis_description.trim()) return setError('Financial need description is required.')
    if (isLift && !presenting_problem.trim()) return setError('Presenting problem is required.')

    setSaving(true)
    try {
      const assistanceFields = Object.fromEntries(
        ASSISTANCE_ITEMS.flatMap(({ key }) => [
          [`assistance_${key}`, assistance[key].checked],
          [`assistance_${key}_amt`, assistance[key].checked ? assistance[key].amount : null],
        ])
      )

      const details = isLift ? {
        beneficiary_name, address, attends_huntington_school,
        applicant_phone, applicant_email, housing_status: housing_status || null,
        residence_length, occupation, employer, employer_address,
        employment_type: employment_type || null, hours_per_week, annual_salary, weekly_salary,
        other_assistance, income_expenses_narrative,
        crisis_description, justification: crisis_description, presenting_problem,
        sustainability_statement,
        first_request: first_request === '' ? null : first_request !== 'no',
        prior_request_explanation: first_request === 'no' ? prior_request_explanation : null,
        confidential, confidentiality_notes, consent_disclosure,
        ...assistanceFields,
      } : {
        beneficiary_name, address, dob: dob || null, attends_huntington_school,
        justification, financial_narrative,
      }

      const householdMembers = household.filter(m => m.full_name.trim()).map((m, i) => ({
        full_name: m.full_name.trim(), age: m.age || null, married: m.married, sort_order: i,
      }))

      const res = await fetch(`/api/grants/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          requested_amount: requested_amount ? parseFloat(requested_amount) : 0,
          details,
          household_members: householdMembers,
          submit,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
      router.refresh()
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
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Transcribe Application</h2>
        <p className="text-xs text-gray-400">Enter details from the paper form. Save draft at any time, or Save &amp; Submit when complete.</p>
      </div>

      {/* Beneficiary */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          {isLift ? 'Applicant' : 'Child'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>{isLift ? 'Applicant / Family Name' : "Child's Full Name"} {req}</label>
            <input value={beneficiary_name} onChange={e => setBeneficiaryName(e.target.value)} className={inputCls} />
          </div>
          {!isLift && (
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputCls} />
            </div>
          )}
          {isLift && (
            <>
              <div>
                <label className={labelCls}>Phone</label>
                <input value={applicant_phone} onChange={e => setApplicantPhone(e.target.value)} placeholder="(631) 555-0100" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input value={applicant_email} onChange={e => setApplicantEmail(e.target.value)} className={inputCls} />
              </div>
            </>
          )}
          <div className="col-span-2">
            <label className={labelCls}>Home Address {req}</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, Town, NY ZIP" className={inputCls} />
          </div>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={attends_huntington_school} onChange={e => setAttendsHuntington(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
          <span className="text-sm text-gray-600">Does not reside in Town of Huntington but attends a Huntington school district school</span>
        </label>
      </section>

      {/* Lift Fund — Housing + Employment */}
      {isLift && (
        <>
          <hr className="border-gray-100" />
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Housing &amp; Employment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Housing Status</label>
                <select value={housing_status} onChange={e => setHousingStatus(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="rented">Rented</option>
                  <option value="owned">Owned</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Length at Residence</label>
                <input value={residence_length} onChange={e => setResidenceLength(e.target.value)} placeholder="e.g. 3 years" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Occupation</label>
                <input value={occupation} onChange={e => setOccupation(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Employment Type</label>
                <select value={employment_type} onChange={e => setEmploymentType(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="not_employed">Not employed</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Employer</label>
                <input value={employer} onChange={e => setEmployer(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Annual Salary</label>
                <input value={annual_salary} onChange={e => setAnnualSalary(e.target.value)} placeholder="e.g. $45,000 or N/A" className={inputCls} />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Household */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Household Members</h3>
              <button type="button" onClick={addMember} className="text-xs text-[#1B52C1] hover:underline">+ Add</button>
            </div>
            {household.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className={labelCls}>Full Name</label>}
                  <input value={m.full_name} onChange={e => updateMember(i, 'full_name', e.target.value)} placeholder="Full name" className={inputCls} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className={labelCls}>Age</label>}
                  <input value={m.age} onChange={e => updateMember(i, 'age', e.target.value)} placeholder="Age" className={inputCls} />
                </div>
                <div className="col-span-3 flex items-center gap-2 pb-2">
                  <input type="checkbox" checked={m.married} onChange={e => updateMember(i, 'married', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
                  <span className="text-sm text-gray-600">Married</span>
                </div>
                {household.length > 1 && (
                  <div className="col-span-2">
                    <button type="button" onClick={() => removeMember(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <hr className="border-gray-100" />

          {/* Public Assistance */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Public Assistance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ASSISTANCE_ITEMS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <input type="checkbox" checked={assistance[key].checked} onChange={e => setAst(key, 'checked', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1B52C1] shrink-0" />
                  <span className="text-sm text-gray-700 w-24 shrink-0">{label}</span>
                  {assistance[key].checked && (
                    <input value={assistance[key].amount} onChange={e => setAst(key, 'amount', e.target.value)}
                      placeholder="$ / month" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>
              ))}
            </div>
            <div>
              <label className={labelCls}>Other Assistance</label>
              <textarea value={other_assistance} onChange={e => setOtherAssistance(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Financial Need */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Financial Need</h3>
            <div>
              <label className={labelCls}>Monthly Income &amp; Expenses</label>
              <textarea value={income_expenses_narrative} onChange={e => setIncomeExpenses(e.target.value)} rows={4} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Description of Financial Need {req}</label>
              <textarea value={crisis_description} onChange={e => setCrisisDescription(e.target.value)} rows={4} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Presenting Problem {req}</label>
              <textarea value={presenting_problem} onChange={e => setPresentingProblem(e.target.value)} rows={4} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Financial Sustainability</label>
              <textarea value={sustainability_statement} onChange={e => setSustainability(e.target.value)} rows={3} className={inputCls + ' resize-none'} />
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Prior requests */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Prior Requests</h3>
            <div className="flex flex-col gap-2">
              {([
                { value: 'yes', label: 'Yes — first request' },
                { value: 'no', label: 'No — has had prior requests' },
                { value: 'no_prior', label: 'No prior requests on file' },
              ] as const).map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="first_request" value={value} checked={first_request === value} onChange={() => setFirstRequest(value)}
                    className="h-4 w-4 border-gray-300 text-[#1B52C1]" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {first_request === 'no' && (
              <div>
                <label className={labelCls}>Explain prior request</label>
                <textarea value={prior_request_explanation} onChange={e => setPriorExplanation(e.target.value)} rows={3} className={inputCls + ' resize-none'} />
              </div>
            )}
          </section>

          <hr className="border-gray-100" />

          {/* Confidentiality */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Confidentiality &amp; Consent</h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={confidential} onChange={e => setConfidential(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
              <span className="text-sm text-gray-600">This application requires strict confidentiality.</span>
            </label>
            {confidential && (
              <textarea value={confidentiality_notes} onChange={e => setConfidentialityNotes(e.target.value)} rows={2} placeholder="Confidentiality notes…" className={inputCls + ' resize-none'} />
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consent_disclosure} onChange={e => setConsentDisclosure(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1]" />
              <span className="text-sm text-gray-600">Applicant consents to JWL communicating with agencies as needed to process this application.</span>
            </label>
          </section>
        </>
      )}

      {/* Charitable Children fields */}
      {!isLift && (
        <>
          <hr className="border-gray-100" />
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Application Details</h3>
            <div>
              <label className={labelCls}>Justification {req}</label>
              <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={4} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Family Financial Situation</label>
              <textarea value={financial_narrative} onChange={e => setFinancialNarrative(e.target.value)} rows={3} className={inputCls + ' resize-none'} />
            </div>
          </section>
        </>
      )}

      {/* Amount */}
      <hr className="border-gray-100" />
      <section>
        <label className={labelCls}>Requested Amount</label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input type="number" min="1" value={requested_amount} onChange={e => setRequestedAmount(e.target.value)}
            placeholder="0.00" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </section>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => handleSave(false)} disabled={saving}
          className="border border-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving}
          className="bg-[#1B52C1] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#1540A0] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save & Submit for review'}
        </button>
      </div>
    </div>
  )
}
