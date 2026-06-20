import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ExportButton from './ExportButton'
import UnassignButton from './UnassignButton'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminClient()

  const { data: assignment } = await supabase
    .from('assignments')
    .select(`
      id, created_at, exported,
      jwl_members ( name, email ),
      assignment_children (
        children (
          id, first_name, age, gender, gift_requests, top_size, bottom_size, shoe_size,
          families ( family_number, schools ( name, districts ( name ) ) )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!assignment) notFound()

  const member = assignment.jwl_members as any
  const children = (assignment.assignment_children as any[])
    ?.map(ac => ac.children)
    .sort((a: any, b: any) => {
      const schoolA = a?.families?.schools?.name ?? ''
      const schoolB = b?.families?.schools?.name ?? ''
      return schoolA.localeCompare(schoolB) || a.families?.family_number?.localeCompare(b.families?.family_number)
    }) ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/assignments" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-2xl font-semibold text-gray-900">Assignment</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900 text-lg">{member?.name}</p>
          {member?.email && <p className="text-sm text-gray-500">{member.email}</p>}
          <p className="text-xs text-gray-400">
            Created {new Date(assignment.created_at).toLocaleDateString()} · {children.length} children
          </p>
        </div>
        <ExportButton assignmentId={assignment.id} exported={assignment.exported} memberName={member?.name} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Age / Gender</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Family #</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">School</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Gift requests</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Sizes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {children.map((child: any) => (
              <tr key={child.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{child.first_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {[child.age ? `Age ${child.age}` : null, child.gender].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{child.families?.family_number}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  <span className="block">{child.families?.schools?.name}</span>
                  <span className="text-gray-400">{child.families?.schools?.districts?.name}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs">
                  <span className="line-clamp-2">{child.gift_requests || '—'}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {[
                    child.top_size ? `Top: ${child.top_size}` : null,
                    child.bottom_size ? `Bottom: ${child.bottom_size}` : null,
                    child.shoe_size ? `Shoes: ${child.shoe_size}` : null,
                  ].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <UnassignButton assignmentId={assignment.id} childId={child.id} childName={child.first_name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
