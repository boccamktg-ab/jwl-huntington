'use client'

import { useState } from 'react'
import TranscribeForm from './TranscribeForm'

type Props = {
  applicationId: string
  grantType: 'charitable_children' | 'lift_fund'
  isAdmin: boolean
  isCharitable: boolean
  requestedAmount: number
  detail: any
  householdMembers: any[]
}

function Row({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      {multiline
        ? <p className="text-sm text-gray-900 text-right whitespace-pre-wrap max-w-xs">{value}</p>
        : <span className="text-sm text-gray-900 text-right">{value}</span>}
    </div>
  )
}

const ASSISTANCE_KEYS = ['medicaid','adc','snap','wic','ssi','unemployment','section8','heap'] as const

export default function ApplicationDetailsCard({
  applicationId, grantType, isAdmin, isCharitable, requestedAmount, detail, householdMembers,
}: Props) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Edit Application Details</h2>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
        <TranscribeForm
          applicationId={applicationId}
          grantType={grantType}
          initialDetail={detail}
          initialHousehold={householdMembers}
          onSaved={() => setEditing(false)}
          editMode
        />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Application Details</h2>
        {isAdmin && (
          <button onClick={() => setEditing(true)}
            className="text-xs text-[#1B52C1] hover:underline">
            Edit
          </button>
        )}
      </div>

      {isAdmin
        ? <Row label="Beneficiary" value={detail?.beneficiary_name} />
        : <Row label="Beneficiary" value="[Confidential]" />}
      {isAdmin
        ? <Row label="Address" value={detail?.address} />
        : <Row label="Address" value="[Confidential]" />}
      {detail?.attends_huntington_school && (
        <Row label="Residency exception" value="Attends a Huntington school district school" />
      )}

      {isCharitable ? (
        <>
          {isAdmin && detail?.dob && (
            <Row label="Date of Birth" value={new Date(detail.dob).toLocaleDateString('en-US', { timeZone: 'UTC' })} />
          )}
          <Row label="Justification" value={detail?.justification} multiline />
          {detail?.financial_narrative && <Row label="Financial Narrative" value={detail.financial_narrative} multiline />}
        </>
      ) : (
        <>
          {householdMembers && householdMembers.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-gray-500">Household Members</span>
              <div className="border border-gray-100 rounded-lg overflow-hidden text-sm">
                <div className="grid grid-cols-3 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
                  <span>Name</span><span>Age</span><span>Married</span>
                </div>
                {householdMembers.map((m: any) => (
                  <div key={m.id} className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100 text-xs">
                    <span>{isAdmin ? m.full_name : '[Confidential]'}</span>
                    <span>{m.age ?? '—'}</span>
                    <span>{m.married ? 'Yes' : 'No'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && detail?.applicant_phone && <Row label="Phone" value={detail.applicant_phone} />}
          {isAdmin && detail?.applicant_email && <Row label="Email" value={detail.applicant_email} />}

          {detail?.housing_status && <Row label="Housing" value={detail.housing_status === 'rented' ? 'Rented' : 'Owned'} />}
          {detail?.residence_length && <Row label="Time at Residence" value={detail.residence_length} />}
          {detail?.occupation && <Row label="Occupation" value={detail.occupation} />}
          {detail?.employment_type && <Row label="Employment Type" value={
            ({ full_time: 'Full-time', part_time: 'Part-time', not_employed: 'Not employed', other: 'Other' } as Record<string, string>)[detail.employment_type] ?? detail.employment_type
          } />}
          {isAdmin && detail?.employer && <Row label="Employer" value={detail.employer} />}
          {detail?.annual_salary && <Row label="Annual Salary" value={detail.annual_salary} />}
          {detail?.weekly_salary && <Row label="Weekly Salary" value={detail.weekly_salary} />}

          {ASSISTANCE_KEYS.some(k => detail?.[`assistance_${k}`]) && (
            <div className="space-y-1">
              <span className="text-sm text-gray-500">Public Assistance</span>
              <div className="flex flex-wrap gap-2">
                {ASSISTANCE_KEYS.map(k => {
                  if (!detail?.[`assistance_${k}`]) return null
                  const amt = detail?.[`assistance_${k}_amt`]
                  return (
                    <span key={k} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {k.toUpperCase()}{amt ? ` — $${amt}/mo` : ''}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {detail?.other_assistance && <Row label="Other Assistance" value={detail.other_assistance} multiline />}
          {detail?.income_expenses_narrative && <Row label="Income / Expenses" value={detail.income_expenses_narrative} multiline />}

          <Row label="Financial Need" value={detail?.crisis_description} multiline />
          {detail?.presenting_problem && <Row label="Presenting Problem" value={detail.presenting_problem} multiline />}
          <Row label="Financial Sustainability" value={detail?.sustainability_statement} multiline />

          {detail?.first_request !== null && detail?.first_request !== undefined && (
            <Row label="First JWL Request?" value={detail.first_request ? 'Yes' : 'No'} />
          )}
          {detail?.prior_request_explanation && (
            <Row label="Prior Request Explanation" value={detail.prior_request_explanation} multiline />
          )}
        </>
      )}

      <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">Requested amount</span>
        <span className="font-medium text-gray-900">${Number(requestedAmount).toFixed(2)}</span>
      </div>
    </div>
  )
}
