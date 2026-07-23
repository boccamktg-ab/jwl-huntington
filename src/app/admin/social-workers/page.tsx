import { createClient } from '@supabase/supabase-js'
import ApprovalActions from './ApprovalActions'
import SwSubmissionsToggle from './SwSubmissionsToggle'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SocialWorkersPage() {
  const supabase = adminClient()

  const [{ data: socialWorkers }, { data: families }] = await Promise.all([
    supabase
      .from('social_workers')
      .select(`
        id, name, email, status, intake_complete, submissions_enabled, created_at,
        social_worker_schools ( schools ( name, districts ( name ) ) )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('families')
      .select('id, social_worker_id, status, submitted_at'),
  ])

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  // Map social_worker_id → overdue submitted family count
  const overdueMap: Record<string, number> = {}
  for (const f of families ?? []) {
    if (f.status === 'submitted' && f.submitted_at && f.submitted_at < cutoff) {
      overdueMap[f.social_worker_id] = (overdueMap[f.social_worker_id] ?? 0) + 1
    }
  }

  const overdueTotal = Object.keys(overdueMap).length
  const pending = socialWorkers?.filter(sw => sw.status === 'pending') ?? []
  const others = socialWorkers?.filter(sw => sw.status !== 'pending') ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Social Workers</h1>

      {overdueTotal > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Action needed:</strong> {overdueTotal} social {overdueTotal === 1 ? 'worker has' : 'workers have'} families submitted for more than 72 hours without approval. They are highlighted below.
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-base font-medium text-amber-700 mb-3">
            Pending approval ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(sw => (
              <SocialWorkerCard key={sw.id} sw={sw} overdueCount={overdueMap[sw.id] ?? 0} showActions />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-medium text-gray-700 mb-3">All accounts</h2>
        {others.length === 0 && pending.length === 0 && (
          <p className="text-sm text-gray-400">No social workers registered yet.</p>
        )}
        <div className="space-y-3">
          {others.map(sw => (
            <SocialWorkerCard key={sw.id} sw={sw} overdueCount={overdueMap[sw.id] ?? 0} showActions />
          ))}
        </div>
      </section>
    </div>
  )
}

function SocialWorkerCard({ sw, overdueCount, showActions }: { sw: any; overdueCount: number; showActions: boolean }) {
  const schools = sw.social_worker_schools
    ?.map((sws: any) => `${sws.schools?.name} (${sws.schools?.districts?.name})`)
    .join(', ')

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    disabled: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start justify-between gap-4 ${overdueCount > 0 ? 'border-amber-300' : 'border-gray-200'}`}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{sw.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[sw.status]}`}>
            {sw.status}
          </span>
          {sw.intake_complete && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
              intake complete
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
              ⚠ {overdueCount} overdue {overdueCount === 1 ? 'family' : 'families'}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{sw.email}</p>
        {schools && <p className="text-xs text-gray-400">{schools}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {sw.status === 'approved' && (
          <SwSubmissionsToggle swId={sw.id} enabled={sw.submissions_enabled ?? true} />
        )}
        {showActions && <ApprovalActions id={sw.id} name={sw.name} status={sw.status} />}
      </div>
    </div>
  )
}
