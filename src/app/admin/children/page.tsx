import { createClient } from '@supabase/supabase-js'
import ChildrenFilters from './ChildrenFilters'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; school?: string; sw?: string }>
}) {
  const filters = await searchParams
  const supabase = adminClient()

  const [{ data: districts }, { data: schools }, { data: socialWorkers }] = await Promise.all([
    supabase.from('districts').select('id, name').order('name'),
    supabase.from('schools').select('id, name, district_id').order('name'),
    supabase.from('social_workers').select('id, name').eq('status', 'approved').order('name'),
  ])

  // Build children query with filters
  let query = supabase
    .from('children')
    .select(`
      id, first_name, age, gender, gift_requests, gift_requests_en, translation_status, top_size, bottom_size, shoe_size,
      families (
        id, family_number, status, social_worker_id,
        schools ( id, name, district_id, districts ( id, name ) ),
        social_workers ( id, name )
      )
    `)
    .order('created_at')

  const { data: allChildren } = await query

  // Filter to approved families only, then apply UI filters
  const children = (allChildren ?? []).filter(child => {
    const fam = child.families as any
    if (fam?.status !== 'approved') return false
    if (filters.district && fam?.schools?.districts?.id !== filters.district) return false
    if (filters.school && fam?.schools?.id !== filters.school) return false
    if (filters.sw && fam?.social_workers?.id !== filters.sw) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Approved Children</h1>
        <span className="text-sm text-gray-500">{children.length} children</span>
      </div>

      <ChildrenFilters
        districts={districts ?? []}
        schools={schools ?? []}
        socialWorkers={socialWorkers ?? []}
        currentFilters={filters}
      />

      {children.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No approved children match your filters.</p>
      ) : (
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {children.map(child => {
                const fam = child.families as any
                return (
                  <tr key={child.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{child.first_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {[child.age ? `Age ${child.age}` : null, child.gender].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fam?.family_number}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <span className="block">{fam?.schools?.name}</span>
                      <span className="text-gray-400">{fam?.schools?.districts?.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <span className="line-clamp-2">{(child as any).gift_requests_en || child.gift_requests || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {[
                        child.top_size ? `Top: ${child.top_size}` : null,
                        child.bottom_size ? `Bottom: ${child.bottom_size}` : null,
                        child.shoe_size ? `Shoes: ${child.shoe_size}` : null,
                      ].filter(Boolean).join(', ') || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
