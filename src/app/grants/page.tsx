import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  needs_more_info: 'Needs More Info',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  paid_closed: 'Paid / Closed',
}

const STATUS_BADGE: Record<string, string> = {
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

export default async function GrantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sw } = await supabase
    .from('social_workers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!sw) redirect('/login')

  const { data: applications } = await supabase
    .from('grant_applications')
    .select(`
      id, grant_type, status, requested_amount, approved_amount, created_at,
      grant_application_details ( beneficiary_name ),
      grant_messages ( author_id, created_at )
    `)
    .eq('referrer_id', sw.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Grant Applications</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/grants/apply/charitable-children"
            className="bg-[#1B52C1] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1540A0]"
          >
            + Charitable Children
          </Link>
          <Link
            href="/grants/apply/lift-fund"
            className="bg-white text-[#1B52C1] border border-[#1B52C1] text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50"
          >
            + Lift Fund
          </Link>
        </div>
      </div>

      {(!applications || applications.length === 0) ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-gray-400 text-sm">No applications yet.</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/grants/apply/charitable-children"
              className="bg-[#1B52C1] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#1540A0]"
            >
              Apply — Charitable Children Grant
            </Link>
            <Link
              href="/grants/apply/lift-fund"
              className="bg-white text-[#1B52C1] border border-[#1B52C1] text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-50"
            >
              Apply — The Lift Fund
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app: any) => {
            const detail = Array.isArray(app.grant_application_details)
              ? app.grant_application_details[0]
              : app.grant_application_details

            const messages: { author_id: string; created_at: string }[] =
              app.grant_messages ?? []

            // Latest message not sent by this social worker = unread reviewer message
            const sorted = [...messages].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const latestMsg = sorted[0]
            const hasUnreadMessage =
              latestMsg && latestMsg.author_id !== user.id &&
              !['approved', 'denied', 'paid_closed'].includes(app.status)

            // Card border and left accent by priority: denied > approved > unread message > default
            const cardBorder =
              app.status === 'denied' ? 'border-red-300 bg-red-50' :
              app.status === 'approved' ? 'border-green-300 bg-green-50' :
              hasUnreadMessage ? 'border-amber-300 bg-amber-50' :
              'border-gray-200 bg-white'

            const accentBar =
              app.status === 'denied' ? 'bg-red-400' :
              app.status === 'approved' ? 'bg-green-400' :
              hasUnreadMessage ? 'bg-amber-400' :
              null

            return (
              <Link
                key={app.id}
                href={`/grants/${app.id}`}
                className={`block border rounded-xl overflow-hidden hover:shadow-md transition-all ${cardBorder}`}
              >
                <div className="flex">
                  {accentBar && <div className={`w-1 shrink-0 ${accentBar}`} />}
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {detail?.beneficiary_name ?? '—'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[app.status]}`}>
                            {STATUS_LABELS[app.status]}
                          </span>
                          {hasUnreadMessage && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                              💬 New message
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{GRANT_LABELS[app.grant_type]}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>${Number(app.requested_amount).toFixed(2)} requested</p>
                        {app.approved_amount != null && (
                          <p className="text-green-700 font-medium">${Number(app.approved_amount).toFixed(2)} approved</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
