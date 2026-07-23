import { createClient as adminSupabase } from '@supabase/supabase-js'
import MemberActions from './MemberActions'
import CreateMemberForm from './CreateMemberForm'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminMembersPage() {
  const { data: members } = await db()
    .from('jwl_members')
    .select(`
      id, name, email, children_requested, status, is_admin, is_grants_reviewer, is_jjwl_admin, is_super_admin,
      assignments ( id, assignment_children ( child_id ) )
    `)
    .order('name')

  const rows = (members ?? []).map(m => {
    const totalAssigned = (m.assignments as any[])
      .reduce((sum: number, a: any) => sum + (a.assignment_children?.length ?? 0), 0)
    return { ...m, totalAssigned }
  })

  const pending = rows.filter(r => r.status === 'pending')
  const approved = rows.filter(r => r.status === 'approved')
  const disabled = rows.filter(r => r.status === 'disabled')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">JWL Members</h1>
        <CreateMemberForm />
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Pending approval ({pending.length})
          </h2>
          <MembersTable rows={pending} showActions />
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Active members ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-400">No approved members yet.</p>
        ) : (
          <MembersTable rows={approved} showActions />
        )}
      </div>

      {disabled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Disabled ({disabled.length})
          </h2>
          <MembersTable rows={disabled} showActions />
        </div>
      )}
    </div>
  )
}

function MembersTable({ rows, showActions }: { rows: any[]; showActions?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Requested</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Assigned</th>
            <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
            {showActions && <th className="text-right px-4 py-3 text-gray-500 font-medium w-48">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(m => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
              <td className="px-4 py-3 text-gray-500">{m.email}</td>
              <td className="px-4 py-3 text-center text-gray-700">
                {m.children_requested ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={m.totalAssigned > 0 ? 'text-green-700 font-medium' : 'text-gray-400'}>
                  {m.totalAssigned}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={m.status} />
              </td>
              {showActions && (
                <td className="px-4 py-3 text-right">
                  <MemberActions memberId={m.id} name={m.name} status={m.status} isAdmin={m.is_admin ?? false} isGrantsReviewer={m.is_grants_reviewer ?? false} isJjwlAdmin={m.is_jjwl_admin ?? false} isSuperAdmin={m.is_super_admin ?? false} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Approved</span>
  if (status === 'pending') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Disabled</span>
}
