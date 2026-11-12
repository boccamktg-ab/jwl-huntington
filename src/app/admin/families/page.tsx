import { createClient } from '@supabase/supabase-js'
import DeleteFamilyButton from './DeleteFamilyButton'
import RejectFamilyButton from './RejectFamilyButton'
import ReturnFamilyButton from './ReturnFamilyButton'
import FamiliesFilters from './FamiliesFilters'

export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default async function AdminFamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; school?: string; sw?: string; status?: string }>
}) {
  const filters = await searchParams
  const supabase = db()

  const [
    { data: allFamilies },
    { data: districts },
    { data: schools },
    { data: socialWorkers },
  ] = await Promise.all([
    supabase
      .from('families')
      .select(`
        id, family_number, num_children, status, submitted_at,
        social_workers ( id, name ),
        schools ( id, name, district_id, districts ( id, name ) ),
        children ( id )
      `)
      .order('status')
      .order('family_number'),
    supabase.from('districts').select('id, name').order('name'),
    supabase.from('schools').select('id, name, district_id').order('name'),
    supabase.from('social_workers').select('id, name').eq('status', 'approved').order('name'),
  ])

  const families = (allFamilies ?? []).filter((f: any) => {
    if (filters.status && f.status !== filters.status) return false
    if (filters.district && f.schools?.districts?.id !== filters.district) return false
    if (filters.school && f.schools?.id !== filters.school) return false
    if (filters.sw && f.social_workers?.id !== filters.sw) return false
    return true
  })

  const draft     = families.filter((f: any) => f.status === 'draft')
  const submitted = families.filter((f: any) => f.status === 'submitted')
  const approved  = families.filter((f: any) => f.status === 'approved')
  const rejected  = families.filter((f: any) => f.status === 'rejected')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">All Families</h1>
        <span className="text-sm text-gray-500">{families.length} of {(allFamilies ?? []).length} total</span>
      </div>

      <FamiliesFilters
        districts={districts ?? []}
        schools={schools ?? []}
        socialWorkers={socialWorkers ?? []}
        currentFilters={filters}
      />

      {[
        { label: 'Submitted', rows: submitted, color: 'amber' },
        { label: 'Draft', rows: draft, color: 'gray' },
        { label: 'Approved', rows: approved, color: 'green' },
        { label: 'Rejected', rows: rejected, color: 'red' },
      ].map(({ label, rows, color }) =>
        rows.length > 0 ? (
          <div key={label}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
              color === 'amber' ? 'text-amber-700' : color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {label} ({rows.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Family #</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Social Worker</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">School</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Children</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((f: any) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{f.family_number}</td>
                      <td className="px-4 py-3 text-gray-600">{f.social_workers?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <span className="block">{f.schools?.name}</span>
                        <span className="text-gray-400">{f.schools?.districts?.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{f.children?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[f.status]}`}>
                          {STATUS_LABELS[f.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 items-center justify-end">
                          {f.status === 'submitted' && (
                            <RejectFamilyButton familyId={f.id} familyName={f.family_number?.toString() ?? 'Family'} />
                          )}
                          {f.status === 'approved' && (
                            <ReturnFamilyButton familyId={f.id} familyNumber={f.family_number} />
                          )}
                          <DeleteFamilyButton familyId={f.id} familyNumber={f.family_number} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      )}

      {families.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No families match your filters.</p>
      )}
    </div>
  )
}
