import { createClient as adminSupabase } from '@supabase/supabase-js'
import Link from 'next/link'

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
  charitable_children: 'Charitable Children',
  lift_fund: 'Lift Fund',
}

const ACTIVE_STATUSES = ['submitted', 'needs_more_info', 'under_review']

export default async function ReviewerDashboardPage() {
  const { data: applications } = await db()
    .from('grant_applications')
    .select(`
      id, grant_type, status, requested_amount, approved_amount, submitted_at,
      grant_application_details ( beneficiary_name ),
      social_workers ( name, email )
    `)
    .neq('status', 'draft')
    .order('submitted_at', { ascending: false })

  const apps = (applications ?? []) as any[]
  const active = apps.filter(a => ACTIVE_STATUSES.includes(a.status))
  const closed = apps.filter(a => !ACTIVE_STATUSES.includes(a.status))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Grant Applications</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-400">No active applications.</p>
        ) : (
          <ApplicationTable rows={active} />
        )}
      </section>

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Closed ({closed.length})
          </h2>
          <ApplicationTable rows={closed} />
        </section>
      )}
    </div>
  )
}

function ApplicationTable({ rows }: { rows: any[] }) {
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
            const referrer = Array.isArray(app.social_workers)
              ? app.social_workers[0]
              : app.social_workers

            return (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/grants/reviewer/${app.id}`} className="font-medium text-[#1B52C1] hover:underline">
                    {detail?.beneficiary_name ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{GRANT_LABELS[app.grant_type]}</td>
                <td className="px-4 py-3 text-gray-500">{referrer?.name ?? '—'}</td>
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
