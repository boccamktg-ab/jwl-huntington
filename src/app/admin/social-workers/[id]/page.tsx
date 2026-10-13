import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ApprovalActions from '../ApprovalActions'
import SwSubmissionsToggle from '../SwSubmissionsToggle'
import EditSwForm from './EditSwForm'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SocialWorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = adminClient()

  const [{ data: sw }, { data: families }, { data: allSchools }] = await Promise.all([
    db
      .from('social_workers')
      .select(`
        id, name, email, status, intake_complete, submissions_enabled, created_at, sw_type, organization, auth_id,
        social_worker_schools ( school_id, schools ( name, districts ( name ) ) )
      `)
      .eq('id', id)
      .single(),
    db
      .from('families')
      .select('id, family_number, status, submitted_at, schools ( name )')
      .eq('social_worker_id', id)
      .order('created_at', { ascending: false }),
    db
      .from('schools')
      .select('id, name, districts ( name )')
      .order('name'),
  ])

  if (!sw) notFound()

  const schoolIds = (sw.social_worker_schools as any[])?.map((s: any) => s.school_id) ?? []
  const schoolNames = (sw.social_worker_schools as any[])
    ?.map((s: any) => `${s.schools?.name} (${s.schools?.districts?.name})`)
    .join(', ')

  const schools = (allSchools ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    districtName: s.districts?.name ?? '',
  }))

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    disabled: 'bg-gray-100 text-gray-600',
  }

  const familyStatusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
  }

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/social-workers" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-2xl font-semibold text-gray-900">Social Worker</h1>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold text-gray-900">{sw.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[sw.status]}`}>
                {sw.status}
              </span>
              {sw.sw_type === 'community' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">community</span>
              )}
              {sw.intake_complete && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">intake complete</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{sw.email}</p>
            {sw.sw_type === 'community'
              ? sw.organization && <p className="text-xs text-gray-400">{sw.organization}</p>
              : schoolNames && <p className="text-xs text-gray-400">{schoolNames}</p>
            }
            <p className="text-xs text-gray-400">Registered {new Date(sw.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {sw.status === 'approved' && (
              <SwSubmissionsToggle swId={sw.id} enabled={sw.submissions_enabled ?? true} />
            )}
            <ApprovalActions id={sw.id} name={sw.name} status={sw.status} />
          </div>
        </div>

        <EditSwForm
          sw={{ id: sw.id, name: sw.name, email: sw.email, swType: sw.sw_type, organization: sw.organization, schoolIds }}
          allSchools={schools}
        />
      </div>

      {/* Families */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Families ({(families ?? []).length})
        </h2>
        {(families ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No families yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Family #</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">School</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(families ?? []).map((f: any) => {
                  const overdue = f.status === 'submitted' && f.submitted_at && f.submitted_at < cutoff
                  return (
                    <tr key={f.id} className={overdue ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">#{f.family_number}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{(f.schools as any)?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${familyStatusColors[f.status]}`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {f.submitted_at ? new Date(f.submitted_at).toLocaleDateString() : '—'}
                        {overdue && <span className="ml-1 text-amber-600 font-medium">⚠ overdue</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
