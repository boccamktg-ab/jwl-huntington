import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import IntakeCompleteButton from './IntakeCompleteButton'
import FamiliesList from './FamiliesList'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sw } = await supabase
    .from('social_workers')
    .select('id, name, status, intake_complete')
    .eq('auth_id', user.id)
    .single()

  if (!sw) redirect('/login')

  if (sw.status === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold text-gray-900">Account pending approval</h1>
          <p className="text-sm text-gray-500">Your account is awaiting admin approval.</p>
          <form action="/api/auth/logout" method="POST">
            <button className="text-sm text-gray-500 hover:underline">Sign out</button>
          </form>
        </div>
      </div>
    )
  }

  const { data: families } = await supabase
    .from('families')
    .select(`
      id, family_number, num_children, status, submitted_at,
      schools ( id, name, district_id, districts ( name ) ),
      children ( id )
    `)
    .eq('social_worker_id', sw.id)

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const overdueCount = (families ?? []).filter(
    f => f.status === 'submitted' && f.submitted_at && f.submitted_at < cutoff
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Families</h1>
        <Link
          href="/dashboard/families/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Family
        </Link>
      </div>

      {overdueCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Reminder:</strong> You have {overdueCount} {overdueCount === 1 ? 'family' : 'families'} that {overdueCount === 1 ? 'has' : 'have'} been submitted for more than 72 hours without approval. Please review and approve below.
        </div>
      )}

      <IntakeCompleteButton intakeComplete={sw.intake_complete ?? false} />

      <FamiliesList families={(families ?? []) as any} />
    </div>
  )
}
