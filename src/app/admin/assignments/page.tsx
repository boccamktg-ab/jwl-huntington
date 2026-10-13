import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import DeleteAssignmentButton from './DeleteAssignmentButton'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AssignmentsPage() {
  const supabase = adminClient()

  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id, created_at, exported,
      jwl_members ( name, email ),
      assignment_children ( child_id )
    `)
    .order('created_at', { ascending: false })

  // Count total unassigned approved children
  const { data: allChildren } = await supabase
    .from('children')
    .select('id, families(status)')

  const { data: assignedLinks } = await supabase
    .from('assignment_children')
    .select('child_id')

  const assignedIds = new Set(assignedLinks?.map(a => a.child_id) ?? [])
  const unassignedCount = (allChildren ?? []).filter(c =>
    (c.families as any)?.status === 'approved' && !assignedIds.has(c.id)
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
        <Link
          href="/admin/assignments/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Assignment
        </Link>
      </div>

      {unassignedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>{unassignedCount}</strong> approved children still unassigned
        </div>
      )}

      {!assignments?.length ? (
        <p className="text-sm text-gray-400 py-8 text-center">No assignments yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">JWL Member</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Children</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Created</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Exported</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map(a => {
                const member = a.jwl_members as any
                return (
                  {(() => {
                    const childCount = (a.assignment_children as any[])?.length ?? 0
                    const stale = childCount === 0
                    return (
                      <tr key={a.id} className={stale ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <p className={`font-medium ${stale ? 'text-gray-400' : 'text-gray-900'}`}>{member?.name}</p>
                          {member?.email && <p className="text-xs text-gray-400">{member.email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {stale
                            ? <span className="text-xs font-medium text-red-500">0 children — stale</span>
                            : <span className="text-gray-600">{childCount} children</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {a.exported
                            ? <span className="text-xs text-green-600 font-medium">✓ Exported</span>
                            : <span className="text-xs text-gray-400">Not yet</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {!stale && (
                              <Link
                                href={`/admin/assignments/${a.id}`}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View / Export
                              </Link>
                            )}
                            <DeleteAssignmentButton assignmentId={a.id} childCount={childCount} />
                          </div>
                        </td>
                      </tr>
                    )
                  })()}
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
