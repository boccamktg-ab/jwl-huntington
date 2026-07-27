import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import RequestCountForm from './RequestCountForm'
import ExportButtons from './ExportButtons'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function HolidayCharitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await db()
    .from('jwl_members')
    .select('id, name, email, children_requested')
    .eq('auth_id', user.id)
    .single()

  if (!member) redirect('/login')

  const { data: assignment } = await db()
    .from('assignments')
    .select(`
      id, created_at, exported,
      assignment_children (
        children (
          id, first_name, age, gender, gift_requests, gift_requests_en, top_size, bottom_size, shoe_size,
          families ( family_number, schools ( name, districts ( name ) ) )
        )
      )
    `)
    .eq('jwl_member_id', member.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const children = (assignment?.assignment_children as any[])
    ?.map(ac => ac.children)
    .sort((a: any, b: any) =>
      (a?.families?.schools?.name ?? '').localeCompare(b?.families?.schools?.name ?? '') ||
      (a?.families?.family_number ?? '').localeCompare(b?.families?.family_number ?? '')
    ) ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Holiday Charities</h1>
          <p className="text-sm text-gray-500 mt-1">My assignment</p>
        </div>
        {children.length > 0 && (
          <ExportButtons assignmentId={assignment!.id} memberName={member.name} />
        )}
      </div>

      <RequestCountForm
        memberId={member.id}
        current={member.children_requested}
        assigned={children.length}
      />

      {children.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          No children have been assigned to you yet. Check back soon!
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-800">Your children ({children.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Age / Gender</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Family #</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">School</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Gift requests</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Sizes</th>
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
                    <span className="line-clamp-2">{(child as any).gift_requests_en || child.gift_requests || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {[
                      child.top_size ? `Top: ${child.top_size}` : null,
                      child.bottom_size ? `Bottom: ${child.bottom_size}` : null,
                      child.shoe_size ? `Shoes: ${child.shoe_size}` : null,
                    ].filter(Boolean).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
