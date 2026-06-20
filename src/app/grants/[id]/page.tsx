import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MessageThread from './MessageThread'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  needs_more_info: 'Needs More Info',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  paid_closed: 'Paid / Closed',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  needs_more_info: 'bg-amber-100 text-amber-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  paid_closed: 'bg-gray-100 text-gray-500',
}

const GRANT_LABELS: Record<string, string> = {
  charitable_children: 'Charitable Children Grant',
  lift_fund: 'The Lift Fund',
}

export default async function GrantApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sw } = await supabase
    .from('social_workers')
    .select('id, name')
    .eq('auth_id', user.id)
    .single()
  if (!sw) redirect('/login')

  const { data: app } = await supabase
    .from('grant_applications')
    .select(`
      id, grant_type, status, requested_amount, approved_amount, denial_reason, created_at, submitted_at,
      grant_application_details (
        beneficiary_name, dob, address, attends_huntington_school,
        justification, financial_narrative,
        household_composition, crisis_description, sustainability_statement,
        confidential, confidentiality_notes
      )
    `)
    .eq('id', id)
    .eq('referrer_id', sw.id)
    .single()

  if (!app) notFound()

  const serviceClient = await createServiceClient()
  const { data: documents } = await serviceClient
    .from('grant_documents')
    .select('id, file_name, file_url, uploaded_at')
    .eq('application_id', id)
    .order('uploaded_at', { ascending: true })

  const { data: messages } = await supabase
    .from('grant_messages')
    .select('id, body, created_at, author_id')
    .eq('application_id', id)
    .order('created_at', { ascending: true })

  const detail = Array.isArray(app.grant_application_details)
    ? app.grant_application_details[0]
    : app.grant_application_details

  const isCharitable = app.grant_type === 'charitable_children'
  const canMessage = !['approved', 'denied', 'paid_closed'].includes(app.status)

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{detail?.beneficiary_name ?? '—'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{GRANT_LABELS[app.grant_type]}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[app.status]}`}>
          {STATUS_LABELS[app.status]}
        </span>
      </div>

      {/* Outcome banner */}
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
      {app.status === 'needs_more_info' && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>More information needed.</strong> Please see the message thread below and respond.
        </div>
      )}

      {/* Application details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Application Details</h2>

        <Row label="Address" value={detail?.address} />
        {detail?.attends_huntington_school && (
          <Row label="Residency" value="Attends a Huntington school district school" />
        )}

        {isCharitable ? (
          <>
            {detail?.dob && <Row label="Date of Birth" value={new Date(detail.dob).toLocaleDateString('en-US', { timeZone: 'UTC' })} />}
            <Row label="Justification" value={detail?.justification} multiline />
            {detail?.financial_narrative && <Row label="Financial Narrative" value={detail.financial_narrative} multiline />}
          </>
        ) : (
          <>
            {detail?.household_composition && <Row label="Household" value={detail.household_composition} />}
            <Row label="Financial Crisis" value={detail?.crisis_description} multiline />
            <Row label="Financial Sustainability" value={detail?.sustainability_statement} multiline />
            {detail?.confidential && <Row label="Confidentiality" value={detail.confidentiality_notes ? `Required — ${detail.confidentiality_notes}` : 'Required'} />}
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
            <a
              key={doc.id}
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#1B52C1] hover:underline"
            >
              <span>📄</span>
              <span>{doc.file_name}</span>
            </a>
          ))}
        </div>
      )}

      {/* Message thread */}
      <MessageThread
        applicationId={id}
        messages={(messages ?? []) as any}
        currentUserId={user.id}
        currentUserName={sw.name}
        canMessage={canMessage}
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
