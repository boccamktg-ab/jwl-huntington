import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import IntakeCompleteButton from './IntakeCompleteButton'
import FamiliesTable from './FamiliesTable'
import HelpPanel from '@/components/HelpPanel'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sw } = await supabase
    .from('social_workers')
    .select('id, name, status, intake_complete, sw_type')
    .eq('auth_id', user.id)
    .single()

  if (!sw) redirect('/login')
  if (sw.sw_type === 'community') redirect('/grants')

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

  const [
    { data: families },
    { data: settings },
    { data: swFull },
    { data: swSchools },
  ] = await Promise.all([
    supabase.from('families').select(`
      id, family_number, family_surname, num_children, status, submitted_at,
      schools ( id, name, district_id, districts ( name ) ),
      children ( id )
    `).eq('social_worker_id', sw.id).order('created_at', { ascending: true }),
    db().from('app_settings').select('key, value'),
    db().from('social_workers').select('submissions_enabled').eq('id', sw.id).single(),
    supabase.from('social_worker_schools').select('school_id, schools ( id, name, districts ( name ) )').eq('social_worker_id', sw.id),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
  const systemOpen = settingsMap['submissions_open'] !== 'false'
  const swEnabled = swFull?.submissions_enabled ?? true
  const submissionsOpen = systemOpen && swEnabled
  const closedMessage = !systemOpen
    ? (settingsMap['submissions_closed_message'] ?? 'Family registration is currently closed.')
    : null

  const schoolList = (swSchools ?? []).map((s: any) => ({
    id: s.schools.id,
    name: s.schools.name,
    district_name: s.schools.districts?.name ?? '',
  }))

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const overdueCount = (families ?? []).filter(
    f => f.status === 'submitted' && f.submitted_at && f.submitted_at < cutoff
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Families</h1>
      </div>

      {!submissionsOpen && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-[#1B52C1]">
          {closedMessage
            ? closedMessage
            : <>Your submissions have been closed. To add more families or children, please contact us at <a href="mailto:Info@JWLHuntington.org" className="underline font-medium">Info@JWLHuntington.org</a>.</>
          }
        </div>
      )}

      {overdueCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Reminder:</strong> You have {overdueCount} {overdueCount === 1 ? 'family' : 'families'} that {overdueCount === 1 ? 'has' : 'have'} been submitted for more than 72 hours without approval. Please review and approve below.
        </div>
      )}

      <HelpPanel steps={[
        {
          title: 'Add your families',
          body: 'Use the table below to add each family. Assign a unique family number (e.g. your initials + a number like "JS-01"). The number just needs to be unique within your caseload — JWL uses it to identify the family.',
        },
        {
          title: 'Share the family link',
          body: 'Click into a family to find their unique URL. Copy and send it to the parent or guardian so they can enter their children\'s names, ages, gift requests, and clothing sizes from their own device. The link does not require a login.',
        },
        {
          title: 'Review and approve',
          body: 'Once the family has filled in their children\'s details, open the family and click Approve. Approval sends the family to JWL for gift matching — you cannot make changes after approving, so make sure all information looks correct first.',
        },
        {
          title: 'Need to make changes?',
          body: 'If a child\'s details were entered in Spanish, you\'ll see a translation card to review before approving. If anything looks wrong after submission, contact JWL directly at Info@JWLHuntington.org.',
        },
      ]} />

      <IntakeCompleteButton intakeComplete={sw.intake_complete ?? false} />

      <FamiliesTable
        families={(families ?? []) as any}
        schools={schoolList}
        submissionsOpen={submissionsOpen}
      />
    </div>
  )
}
