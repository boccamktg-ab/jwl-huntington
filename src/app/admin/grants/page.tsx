import { isSuperAdminEmail } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AdminGrantIntake from './AdminGrantIntake'

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

export default async function AdminGrantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const isSuperAdmin = isSuperAdminEmail(user.email)
  const { data: member } = await db()
    .from('jwl_members')
    .select('is_admin, is_super_admin, is_grants_reviewer, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  const canAccess = isSuperAdmin || member?.is_super_admin || member?.is_admin ||
    (member?.status === 'approved' && member?.is_grants_reviewer)
  if (!canAccess) return notFound()

  const { data: applications } = await db()
    .from('grant_applications')
    .select(`
      id, grant_type, status, source, requested_amount, approved_amount,
      created_at, submitted_at, admin_referrer_name, admin_referrer_org, admin_notes,
      grant_application_details ( beneficiary_name ),
      social_workers!grant_applications_referrer_id_fkey ( name )
    `)
    .order('created_at', { ascending: false })

  const pending = (applications ?? []).filter(a =>
    ['pending_transcription', 'incomplete'].includes(a.status)
  )
  const active = (applications ?? []).filter(a =>
    ['submitted', 'needs_more_info', 'under_review'].includes(a.status)
  )

  function getName(a: any) {
    const detail = Array.isArray(a.grant_application_details)
      ? a.grant_application_details[0]
      : a.grant_application_details
    return detail?.beneficiary_name ?? a.admin_referrer_name ?? '—'
  }

  function getReferrer(a: any) {
    const sw = Array.isArray(a.social_workers) ? a.social_workers[0] : a.social_workers
    return sw?.name ?? a.admin_referrer_name ?? '—'
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Grants — Admin Intake</h1>
          <p className="text-sm text-gray-500 mt-1">Add applications on behalf of referrers who contacted JWL outside the portal, or create a placeholder for scan-first transcription.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/grants/new"
            className="inline-flex items-center gap-1.5 bg-[#1B52C1] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1540A0]">
            + Full Entry
          </Link>
          <Link href="/grants/reviewer" className="text-sm text-[#1B52C1] hover:underline">View reviewer queue →</Link>
        </div>
      </div>

      {/* Quick Add & Scan First forms */}
      <AdminGrantIntake />

      {/* Pending Transcription Queue */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Needs Attention ({pending.length})
          </h2>
          <p className="text-xs text-gray-500">These records must be completed before entering the reviewer queue. Pending Transcription cases need their paper form data entered; Incomplete cases need their full application filled in.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Referred By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Added</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{getName(a)}</td>
                    <td className="px-4 py-3 text-gray-600">{a.grant_type === 'charitable_children' ? 'Charitable Children' : 'Lift Fund'}</td>
                    <td className="px-4 py-3 text-gray-600">{getReferrer(a)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/grants/reviewer/${a.id}`} className="text-xs text-[#1B52C1] hover:underline">Open →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active applications summary */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Active Applications ({active.length})</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Requested</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{getName(a)}</td>
                    <td className="px-4 py-3 text-gray-600">{a.grant_type === 'charitable_children' ? 'Charitable Children' : 'Lift Fund'}</td>
                    <td className="px-4 py-3 text-gray-600">${Number(a.requested_amount).toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/grants/reviewer/${a.id}`} className="text-xs text-[#1B52C1] hover:underline">Review →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
