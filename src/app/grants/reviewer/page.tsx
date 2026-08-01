import { createClient as adminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdminEmail } from '@/lib/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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

const GRANT_LABELS: Record<string, string> = {
  charitable_children: 'Charitable Children',
  lift_fund: 'Lift Fund',
}

const ACTIVE_STATUSES = ['submitted', 'needs_more_info', 'under_review', 'pending_transcription', 'incomplete']

export default async function ReviewerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isSuperAdminEmail(user?.email) || await (async () => {
    if (!user) return false
    const { data } = await db().from('jwl_members').select('is_admin, is_super_admin').eq('auth_id', user.id).maybeSingle()
    return !!(data?.is_admin || data?.is_super_admin)
  })()

  const { data: applications } = await db()
    .from('grant_applications')
    .select(`
      id, grant_type, status, requested_amount, approved_amount, submitted_at,
      admin_referrer_name,
      grant_application_details ( beneficiary_name ),
      social_workers!grant_applications_referrer_id_fkey ( name )
    `)
    .neq('status', 'draft')
    .order('submitted_at', { ascending: false })

  const apps = (applications ?? []) as any[]
  const active = apps.filter(a => ACTIVE_STATUSES.includes(a.status))
  const closed = apps.filter(a => !ACTIVE_STATUSES.includes(a.status))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Grant Applications</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link href="/admin/grants/new"
              className="inline-flex items-center gap-1.5 bg-[#1B52C1] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1540A0]">
              + New Application
            </Link>
            <Link href="/admin/grants"
              className="text-sm text-[#1B52C1] hover:underline">
              Intake queue →
            </Link>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-400">No active applications.</p>
        ) : (
          <ApplicationTable rows={active} isAdmin={isAdmin} />
        )}
      </section>

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Closed ({closed.length})
          </h2>
          <ApplicationTable rows={closed} isAdmin={isAdmin} />
        </section>
      )}
    </div>
  )
}

function ApplicationTable({ rows, isAdmin }: { rows: any[]; isAdmin: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Beneficiary</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Grant</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Referred by</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">Amount</th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(app => {
            const detail = Array.isArray(app.grant_application_details)
              ? app.grant_application_details[0]
              : app.grant_application_details
            const sw = Array.isArray(app.social_workers) ? app.social_workers[0] : app.social_workers
            const referrerName = sw?.name ?? app.admin_referrer_name ?? '—'

            return (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/grants/reviewer/${app.id}`} className="font-medium text-[#1B52C1] hover:underline">
                    {isAdmin
                      ? (detail?.beneficiary_name || <span className="italic text-gray-400">Unnamed — open to transcribe</span>)
                      : (detail?.beneficiary_name ? '[Confidential]' : <span className="italic text-gray-400">Unnamed — open to transcribe</span>)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{GRANT_LABELS[app.grant_type]}</td>
                <td className="px-4 py-3 text-gray-500">{referrerName}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[app.status]}`}>
                    {STATUS_LABELS[app.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ${Number(app.requested_amount).toFixed(2)}
                  {app.approved_amount != null && (
                    <span className="block text-xs text-green-700">${Number(app.approved_amount).toFixed(2)} approved</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">
                  {app.submitted_at
                    ? new Date(app.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
