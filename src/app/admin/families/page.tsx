import { createClient } from '@supabase/supabase-js'
import DeleteFamilyButton from './DeleteFamilyButton'

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
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
}

export default async function AdminFamiliesPage() {
  const { data: families } = await db()
    .from('families')
    .select(`
      id, family_number, num_children, status, submitted_at,
      social_workers ( name ),
      schools ( name, districts ( name ) ),
      children ( id )
    `)
    .order('status')
    .order('family_number')

  const draft     = (families ?? []).filter(f => f.status === 'draft')
  const submitted = (families ?? []).filter(f => f.status === 'submitted')
  const approved  = (families ?? []).filter(f => f.status === 'approved')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">All Families</h1>
        <span className="text-sm text-gray-500">{(families ?? []).length} total</span>
      </div>

      {[
        { label: 'Submitted', rows: submitted, color: 'amber' },
        { label: 'Draft', rows: draft, color: 'gray' },
        { label: 'Approved', rows: approved, color: 'green' },
      ].map(({ label, rows, color }) =>
        rows.length > 0 ? (
          <div key={label}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
              color === 'amber' ? 'text-amber-700' : color === 'green' ? 'text-green-700' : 'text-gray-500'
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
                        <DeleteFamilyButton familyId={f.id} familyNumber={f.family_number} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      )}

      {(families ?? []).length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No families yet.</p>
      )}
    </div>
  )
}
