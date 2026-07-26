import { createClient as adminSupabase } from '@supabase/supabase-js'
import MemberActions from './MemberActions'
import CreateMemberForm from './CreateMemberForm'
import MembershipPanel from './MembershipPanel'
import DuesReminderButton from './DuesReminderButton'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const dynamic = 'force-dynamic'

export default async function AdminMembersPage() {
  const currentYear = new Date().getFullYear()

  const { data: members } = await db()
    .from('jwl_members')
    .select(`
      id, name, email, children_requested, status,
      is_admin, is_programs_admin, is_grants_reviewer, is_jjwl_admin, is_super_admin,
      phone, join_year, dues_paid_through_year,
      position_id, position_detail,
      member_positions ( id, label, allows_detail ),
      assignments ( id, assignment_children ( child_id ) )
    `)
    .order('name')

  const rows = (members ?? []).map(m => {
    const totalAssigned = (m.assignments as any[])
      .reduce((sum: number, a: any) => sum + (a.assignment_children?.length ?? 0), 0)

    const paidThrough = (m as any).dues_paid_through_year ?? 0
    const joinYear = (m as any).join_year ?? 0
    const onGrace = joinYear > 0 && joinYear + 1 >= currentYear
    const duesStatus: 'paid' | 'grace' | 'overdue' | 'unknown' =
      paidThrough >= currentYear ? 'paid'
      : onGrace ? 'grace'
      : paidThrough > 0 ? 'overdue'
      : 'unknown'

    return { ...m, totalAssigned, duesStatus }
  })

  const pending = rows.filter(r => r.status === 'pending')
  const approved = rows.filter(r => r.status === 'approved')
  const disabled = rows.filter(r => r.status === 'disabled')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">JWL Members</h1>
        <div className="flex items-center gap-3">
          <DuesReminderButton />
          <CreateMemberForm />
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Pending approval ({pending.length})
          </h2>
          <MembersTable rows={pending} currentYear={currentYear} />
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Active members ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-400">No approved members yet.</p>
        ) : (
          <MembersTable rows={approved} currentYear={currentYear} />
        )}
      </div>

      {disabled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Disabled ({disabled.length})
          </h2>
          <MembersTable rows={disabled} currentYear={currentYear} />
        </div>
      )}
    </div>
  )
}

function MembersTable({ rows, currentYear }: { rows: any[]; currentYear: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Position</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Join yr</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Dues thru</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Dues status</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Assigned</th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(m => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{m.email}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {m.member_positions ? (
                  <>
                    {m.member_positions.label}
                    {m.position_detail && (
                      <span className="block text-gray-400">{m.position_detail}</span>
                    )}
                  </>
                ) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center text-gray-600">
                {m.join_year ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center text-gray-600">
                {m.dues_paid_through_year ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <DuesStatusBadge status={m.duesStatus} />
              </td>
              <td className="px-4 py-3 text-center">
                <span className={m.totalAssigned > 0 ? 'text-green-700 font-medium' : 'text-gray-400'}>
                  {m.totalAssigned}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-col items-end gap-1">
                  <MemberActions memberId={m.id} name={m.name} status={m.status}
                    isAdmin={m.is_admin ?? false} isProgramsAdmin={m.is_programs_admin ?? false}
                    isGrantsReviewer={m.is_grants_reviewer ?? false} isJjwlAdmin={m.is_jjwl_admin ?? false}
                    isSuperAdmin={m.is_super_admin ?? false} />
                  <MembershipPanel
                    memberId={m.id}
                    initialJoinYear={m.join_year}
                    initialDuesPaidThrough={m.dues_paid_through_year}
                    initialPositionId={m.position_id}
                    initialPositionDetail={m.position_detail}
                    initialPhone={m.phone}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DuesStatusBadge({ status }: { status: 'paid' | 'grace' | 'overdue' | 'unknown' }) {
  if (status === 'paid') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
  if (status === 'grace') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">New member</span>
  if (status === 'overdue') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">—</span>
}
