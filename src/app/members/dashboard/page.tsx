import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { isSuperAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function MemberDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const superAdmin = isSuperAdminEmail(user.email)

  const { data: member } = await db()
    .from('jwl_members')
    .select('id, name, is_admin, is_super_admin, is_programs_admin, is_grants_reviewer, is_jjwl_admin')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member && !superAdmin) redirect('/login')

  const isFullAdmin = superAdmin || !!(member?.is_admin || member?.is_super_admin)
  const showHolidayCharities = true
  const showGrants = isFullAdmin || !!member?.is_grants_reviewer
  const showJjwl = isFullAdmin || !!member?.is_jjwl_admin
  const showAdmin = isFullAdmin || !!member?.is_programs_admin

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, {(member?.name ?? 'Admin').split(' ')[0]}</h1>
        <p className="text-sm text-gray-500 mt-1">Select a program to get started.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {showHolidayCharities && (
          <ProgramCard
            href="/members/holiday-charities"
            title="Holiday Charities"
            description="View your child assignment and manage gift requests for the holiday season."
            color="blue"
          />
        )}
        {showGrants && (
          <ProgramCard
            href="/grants/reviewer"
            title="Grants"
            description="Review grant applications for the Charitable Children and Lift Fund programs."
            color="green"
          />
        )}
        {showJjwl && (
          <ProgramCard
            href="/admin/jjwl"
            title="JJWL Admin"
            description="Manage Junior JWL members, events, signups, and volunteer hours."
            color="teal"
          />
        )}
        {showAdmin && (
          <ProgramCard
            href="/admin"
            title={isFullAdmin ? 'Admin' : 'Programs Admin'}
            description={isFullAdmin
              ? 'Full portal administration: members, children, assignments, setup, and more.'
              : 'Manage Holiday Charities: children, assignments, social workers, and setup.'}
            color="indigo"
          />
        )}
        <ProgramCard
          href="/members/meetings"
          title="Meetings"
          description="View upcoming JWL meetings, RSVP, and read past meeting recaps."
          color="purple"
        />
        <ProgramCard
          href="/members/directory"
          title="Member Directory"
          description="View contact information for all active JWL members."
          color="amber"
        />
        <ProgramCard
          href="/members/account"
          title="My Account"
          description="Edit your profile, phone number, and password. View your dues status."
          color="gray"
        />
      </div>
    </div>
  )
}

function ProgramCard({ href, title, description, color }: {
  href: string
  title: string
  description: string
  color: 'blue' | 'green' | 'teal' | 'indigo' | 'purple' | 'amber' | 'gray'
}) {
  const accent: Record<string, string> = {
    blue:   'border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700',
    green:  'border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100 text-green-700',
    teal:   'border-teal-200 hover:border-teal-400 bg-teal-50 hover:bg-teal-100 text-teal-700',
    indigo: 'border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
    purple: 'border-purple-200 hover:border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-700',
    amber:  'border-amber-200 hover:border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-700',
    gray:   'border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 text-gray-700',
  }
  return (
    <Link
      href={href}
      className={`block rounded-xl border-2 p-6 transition-colors ${accent[color]}`}
    >
      <h2 className="font-semibold text-lg mb-2">{title}</h2>
      <p className="text-sm opacity-80 leading-relaxed">{description}</p>
    </Link>
  )
}
