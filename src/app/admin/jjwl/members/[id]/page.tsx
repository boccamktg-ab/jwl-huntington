import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import MemberAdminActions from './MemberAdminActions'
import HourAdjustmentForm from './HourAdjustmentForm'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminJJWLMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = db()

  const [{ data: member }, { data: signups }, { data: adjustments }] = await Promise.all([
    admin
      .from('jjwl_members')
      .select('*, schools(name)')
      .eq('id', id)
      .maybeSingle(),
    admin
      .from('jjwl_signups')
      .select('id, status, hours_awarded, time_slot, signed_up_at, jjwl_events(id, title, event_date, credit_hours)')
      .eq('member_id', id)
      .order('signed_up_at', { ascending: false }),
    admin
      .from('jjwl_hour_adjustments')
      .select('id, delta, reason, adjusted_at, adjusted_by')
      .eq('member_id', id)
      .order('adjusted_at', { ascending: false }),
  ])

  if (!member) notFound()

  const school = Array.isArray(member.schools) ? member.schools[0] : member.schools

  const totalHours = (signups ?? [])
    .filter(s => s.status === 'confirmed_attended')
    .reduce((sum, s) => sum + Number(s.hours_awarded ?? 0), 0)
    + (adjustments ?? []).reduce((sum, a) => sum + Number(a.delta), 0)

  const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Pending Approval',
    approved_unpaid: 'Approved — Awaiting Payment',
    active: 'Active',
    inactive: 'Inactive',
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <a href="/admin/jjwl/members" className="text-sm text-gray-400 hover:text-gray-600">← Members</a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">{member.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Grade {member.grade}{school ? ` · ${(school as any).name}` : ''}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-3xl font-bold text-[#1B52C1]">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-gray-400">total hours</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Row label="Email" value={member.email} />
          <Row label="Phone" value={member.phone} />
          {member.parent_name && <Row label="Parent" value={member.parent_name} />}
          {member.parent_phone && <Row label="Parent phone" value={member.parent_phone} />}
          {member.parent_email && <Row label="Parent email" value={member.parent_email} />}
        </div>
        {member.notes && (
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{member.notes}</p>
          </div>
        )}
      </div>

      {/* Status + actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</h2>
        <p className="text-sm font-medium text-gray-800">{STATUS_LABELS[member.status] ?? member.status}</p>
        <p className="text-sm text-gray-500">
          Membership paid: <span className={member.membership_paid ? 'text-green-700 font-medium' : 'text-amber-700'}>
            {member.membership_paid ? 'Yes' : 'Not yet'}
          </span>
        </p>
        <MemberAdminActions
          memberId={id}
          currentStatus={member.status}
          membershipPaid={member.membership_paid}
        />
      </div>

      {/* Hour adjustment */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adjust Hours</h2>
        <HourAdjustmentForm memberId={id} />
      </div>

      {/* Event history */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Event History</h2>
        {(!signups || signups.length === 0) ? (
          <p className="text-gray-400 text-sm">No event signups yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Event</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(signups ?? []).map((s: any) => {
                  const evt = Array.isArray(s.jjwl_events) ? s.jjwl_events[0] : s.jjwl_events
                  return (
                    <tr key={s.id} className={s.status === 'cancelled' ? 'opacity-40' : ''}>
                      <td className="px-4 py-3">
                        {evt ? (
                          <a href={`/admin/jjwl/events/${evt.id}`} className="text-[#1B52C1] hover:underline">{evt.title}</a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {evt?.event_date ? new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{s.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {s.status === 'confirmed_attended' ? Number(s.hours_awarded ?? 0).toFixed(1) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual adjustments */}
      {adjustments && adjustments.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Manual Adjustments</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Reason</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">By</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(adjustments ?? []).map((a: any) => {
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-gray-700">{a.reason}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.adjusted_by?.slice(0, 8) ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(a.adjusted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${Number(a.delta) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {Number(a.delta) >= 0 ? '+' : ''}{Number(a.delta).toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
