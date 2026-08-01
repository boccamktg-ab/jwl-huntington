import { isSuperAdminEmail } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ReviewerActions from './ReviewerActions'
import ReviewerMessageThread from './ReviewerMessageThread'
import TranscribeForm from './TranscribeForm'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  needs_more_info: 'Needs More Info',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  paid_closed: 'Paid / Closed',
  pending_transcription: 'Pending Transcription',
  incomplete: 'Incomplete',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  needs_more_info: 'bg-amber-100 text-amber-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  paid_closed: 'bg-gray-100 text-gray-500',
  pending_transcription: 'bg-orange-100 text-orange-700',
  incomplete: 'bg-yellow-100 text-yellow-700',
}

export default async function ReviewerApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const isSuperAdmin = isSuperAdminEmail(user.email)

  const { data: reviewer } = await db()
    .from('jwl_members')
    .select('id, name, is_admin, is_grants_reviewer, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  const isAdmin = isSuperAdmin || (reviewer?.is_admin ?? false)
  const isReviewer = reviewer?.status === 'approved' && (reviewer?.is_grants_reviewer ?? false)
  if (!isAdmin && !isReviewer) return notFound()

  const { data: app } = await db()
    .from('grant_applications')
    .select(`
      id, grant_type, status, requested_amount, approved_amount, denial_reason,
      created_at, submitted_at, referrer_id, reviewer_id,
      vote_status, vote_summary,
      grant_application_details (
        beneficiary_name, dob, address, attends_huntington_school,
        justification, financial_narrative,
        household_composition, crisis_description, sustainability_statement,
        confidential, confidentiality_notes,
        applicant_phone, applicant_email,
        housing_status, residence_length, occupation,
        employment_type, employer, employer_address,
        annual_salary, weekly_salary, hours_per_week,
        assistance_medicaid, assistance_medicaid_amt,
        assistance_adc, assistance_adc_amt,
        assistance_snap, assistance_snap_amt,
        assistance_wic, assistance_wic_amt,
        assistance_ssi, assistance_ssi_amt,
        assistance_unemployment, assistance_unemployment_amt,
        assistance_section8, assistance_section8_amt,
        assistance_heap, assistance_heap_amt,
        other_assistance, income_expenses_narrative,
        presenting_problem, first_request, prior_request_explanation
      ),
      social_workers!grant_applications_referrer_id_fkey ( name, email, phone )
    `)
    .eq('id', id)
    .single()

  if (!app || app.status === 'draft') notFound()

  const needsTranscription = ['pending_transcription', 'incomplete'].includes(app.status)

  const detail = Array.isArray(app.grant_application_details)
    ? app.grant_application_details[0]
    : app.grant_application_details
  const referrer = Array.isArray(app.social_workers)
    ? app.social_workers[0]
    : app.social_workers

  const isCharitable = app.grant_type === 'charitable_children'
  const isOpen = !['denied', 'paid_closed', 'pending_transcription', 'incomplete'].includes(app.status)

  // Lifetime cap lookup for Charitable Children
  let lifetimeHistory: any[] = []
  if (isCharitable && detail?.beneficiary_name && detail?.dob) {
    const { data: history } = await db()
      .from('grant_applications')
      .select(`
        id, status, requested_amount, approved_amount, created_at,
        grant_application_details ( beneficiary_name, dob, address )
      `)
      .eq('grant_type', 'charitable_children')
      .neq('id', id)
      .neq('status', 'draft')
      .neq('status', 'denied')

    // Soft match: same name + same DOB
    lifetimeHistory = (history ?? []).filter((h: any) => {
      const d = Array.isArray(h.grant_application_details) ? h.grant_application_details[0] : h.grant_application_details
      return (
        d?.beneficiary_name?.toLowerCase().trim() === detail.beneficiary_name.toLowerCase().trim() &&
        d?.dob === detail.dob
      )
    })
  }

  const lifetimeApproved = lifetimeHistory
    .filter(h => ['approved', 'paid_closed'].includes(h.status))
    .reduce((sum, h) => sum + Number(h.approved_amount ?? 0), 0)
  const lifetimeRemaining = Math.max(0, 1000 - lifetimeApproved)

  const { data: householdMembers } = await db()
    .from('grant_household_members')
    .select('id, full_name, age, married, sort_order')
    .eq('application_id', id)
    .order('sort_order', { ascending: true })

  const { data: documents } = await db()
    .from('grant_documents')
    .select('id, file_name, file_url, uploaded_at')
    .eq('application_id', id)
    .order('uploaded_at', { ascending: true })

  const { data: messages } = await db()
    .from('grant_messages')
    .select('id, body, created_at, author_id, attachment_url, attachment_name')
    .eq('application_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {detail?.confidential ? '[ Confidential ]' : (detail?.beneficiary_name ?? '—')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isCharitable ? 'Charitable Children Grant' : 'The Lift Fund'}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[app.status]}`}>
          {STATUS_LABELS[app.status]}
        </span>
      </div>

      {/* Transcription / incomplete — show editable form */}
      {needsTranscription && (
        <>
          <div className={`rounded-xl px-4 py-3 text-sm border ${
            app.status === 'pending_transcription'
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            {app.status === 'pending_transcription' ? (
              <><strong>Needs Transcription.</strong> Open the scanned document below, then fill in the form to transcribe the paper application. Click <strong>Save &amp; Submit for review</strong> when all fields are complete.</>
            ) : (
              <><strong>Incomplete Record.</strong> This placeholder was created by an admin. Fill in the form below to complete the application before it can be reviewed.</>
            )}
          </div>
          <TranscribeForm
            applicationId={id}
            grantType={app.grant_type as 'charitable_children' | 'lift_fund'}
            initialDetail={detail}
            initialHousehold={householdMembers ?? []}
          />
        </>
      )}

      {/* Admin referrer info */}
      {(app as any).admin_referrer_name && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact (Admin-Entered)</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Name</span><p className="text-gray-900 mt-0.5">{(app as any).admin_referrer_name}</p></div>
            {(app as any).admin_referrer_org && <div><span className="text-gray-500">Organization</span><p className="text-gray-900 mt-0.5">{(app as any).admin_referrer_org}</p></div>}
            {(app as any).admin_referrer_phone && <div><span className="text-gray-500">Phone</span><p className="text-gray-900 mt-0.5">{(app as any).admin_referrer_phone}</p></div>}
            {(app as any).admin_referrer_email && <div><span className="text-gray-500">Email</span><p className="text-gray-900 mt-0.5">{(app as any).admin_referrer_email}</p></div>}
          </div>
          {(app as any).admin_notes && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600 mt-1">
              {(app as any).admin_notes}
            </div>
          )}
        </div>
      )}

      {/* Lifetime cap warning */}
      {isCharitable && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          lifetimeApproved >= 1000
            ? 'bg-red-50 border-red-200 text-red-800'
            : lifetimeApproved > 0
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-gray-50 border-gray-200 text-gray-600'
        }`}>
          <strong>Lifetime cap:</strong> ${lifetimeApproved.toFixed(2)} of $1,000.00 used
          {lifetimeApproved >= 1000
            ? ' — cap reached.'
            : ` — $${lifetimeRemaining.toFixed(2)} remaining.`}
          {lifetimeHistory.length > 0 && (
            <span className="ml-1">({lifetimeHistory.length} prior application{lifetimeHistory.length !== 1 ? 's' : ''} matched by name + DOB.)</span>
          )}
        </div>
      )}

      {/* Referrer info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Referred By</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Name</span><p className="text-gray-900 mt-0.5">{referrer?.name ?? '—'}</p></div>
          <div><span className="text-gray-500">Email</span><p className="text-gray-900 mt-0.5">{referrer?.email ?? '—'}</p></div>
          {referrer?.phone && <div><span className="text-gray-500">Phone</span><p className="text-gray-900 mt-0.5">{referrer.phone}</p></div>}
        </div>
      </div>

      {/* Application details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Application Details</h2>

        {!detail?.confidential && <Row label="Beneficiary" value={detail?.beneficiary_name} />}
        <Row label="Address" value={detail?.address} />
        {detail?.attends_huntington_school && (
          <Row label="Residency exception" value="Attends a Huntington school district school" />
        )}

        {isCharitable ? (
          <>
            {detail?.dob && <Row label="Date of Birth" value={new Date(detail.dob).toLocaleDateString('en-US', { timeZone: 'UTC' })} />}
            <Row label="Justification" value={detail?.justification} multiline />
            {detail?.financial_narrative && <Row label="Financial Narrative" value={detail.financial_narrative} multiline />}
          </>
        ) : (
          <>
            {/* Household Members */}
            {householdMembers && householdMembers.length > 0 && (
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Household Members</span>
                <div className="border border-gray-100 rounded-lg overflow-hidden text-sm">
                  <div className="grid grid-cols-3 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
                    <span>Name</span><span>Age</span><span>Married</span>
                  </div>
                  {householdMembers.map((m: any) => (
                    <div key={m.id} className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100 text-xs">
                      <span>{m.full_name}</span>
                      <span>{m.age ?? '—'}</span>
                      <span>{m.married ? 'Yes' : 'No'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detail?.household_composition && !householdMembers?.length && (
              <Row label="Household" value={detail.household_composition} />
            )}

            {/* Contact */}
            {detail?.applicant_phone && <Row label="Phone" value={detail.applicant_phone} />}
            {detail?.applicant_email && <Row label="Email" value={detail.applicant_email} />}

            {/* Employment */}
            {detail?.housing_status && <Row label="Housing" value={detail.housing_status === 'rented' ? 'Rented' : 'Owned'} />}
            {detail?.residence_length && <Row label="Time at Residence" value={detail.residence_length} />}
            {detail?.occupation && <Row label="Occupation" value={detail.occupation} />}
            {detail?.employment_type && <Row label="Employment Type" value={
              ({ full_time: 'Full-time', part_time: 'Part-time', not_employed: 'Not employed', other: 'Other' } as Record<string, string>)[detail.employment_type] ?? detail.employment_type
            } />}
            {detail?.employer && <Row label="Employer" value={detail.employer} />}
            {detail?.annual_salary && <Row label="Annual Salary" value={detail.annual_salary} />}
            {detail?.weekly_salary && <Row label="Weekly Salary" value={detail.weekly_salary} />}

            {/* Public Assistance */}
            {(['medicaid','adc','snap','wic','ssi','unemployment','section8','heap'] as const).some(k => (detail as any)?.[`assistance_${k}`]) && (
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Public Assistance</span>
                <div className="flex flex-wrap gap-2">
                  {(['medicaid','adc','snap','wic','ssi','unemployment','section8','heap'] as const).map(k => {
                    if (!(detail as any)?.[`assistance_${k}`]) return null
                    const amt = (detail as any)?.[`assistance_${k}_amt`]
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

            {/* Need */}
            <Row label="Financial Need" value={detail?.crisis_description} multiline />
            {detail?.presenting_problem && <Row label="Presenting Problem" value={detail.presenting_problem} multiline />}
            <Row label="Financial Sustainability" value={detail?.sustainability_statement} multiline />

            {/* First request */}
            {detail?.first_request !== null && detail?.first_request !== undefined && (
              <Row label="First JWL Request?" value={detail.first_request ? 'Yes' : 'No'} />
            )}
            {detail?.prior_request_explanation && (
              <Row label="Prior Request Explanation" value={detail.prior_request_explanation} multiline />
            )}

            {detail?.confidential && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <strong>Confidential.</strong>{detail.confidentiality_notes ? ` ${detail.confidentiality_notes}` : ''}
              </div>
            )}
          </>
        )}

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Requested amount</span>
          <span className="font-medium text-gray-900">${Number(app.requested_amount).toFixed(2)}</span>
        </div>
      </div>

      {/* Documents */}
      {documents && documents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Documents</h2>
          {documents.map((doc: any) => (
            <a key={doc.id} href={`/api/grants/file?path=${encodeURIComponent(doc.file_url)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#1B52C1] hover:underline">
              <span>📄</span><span>{doc.file_name}</span>
            </a>
          ))}
        </div>
      )}

      {/* Review actions */}
      {isOpen && (
        <ReviewerActions
          applicationId={id}
          currentStatus={app.status}
          requestedAmount={Number(app.requested_amount)}
          maxAmount={isCharitable ? lifetimeRemaining : 3000}
          reviewerId={reviewer?.id ?? null}
          voteStatus={app.vote_status ?? null}
          voteSummary={app.vote_summary ?? null}
        />
      )}

      {/* Outcome */}
      {app.status === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <strong>Approved</strong> — ${Number(app.approved_amount).toFixed(2)} awarded.
        </div>
      )}
      {app.status === 'denied' && app.denial_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <strong>Denied:</strong> {app.denial_reason}
        </div>
      )}

      {/* Message thread */}
      <ReviewerMessageThread
        applicationId={id}
        messages={(messages ?? []) as any}
        currentUserId={user.id}
        canMessage={isOpen}
      />
    </div>
  )
}

function Row({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  if (!value) return null
  return (
    <div className={multiline ? 'space-y-1' : 'flex items-start justify-between gap-4'}>
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 ${multiline ? 'whitespace-pre-wrap' : 'text-right'}`}>{value}</span>
    </div>
  )
}
