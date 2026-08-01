import { createClient } from '@supabase/supabase-js'
import { createClient as serverClient } from '@/lib/supabase/server'
import { isSuperAdminEmail } from '@/lib/admin'
import Link from 'next/link'
import NotificationsList from './NotificationsList'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()

  const superAdmin = isSuperAdminEmail(user?.email)

  const { data: self } = superAdmin ? { data: null } : await db()
    .from('jwl_members')
    .select('is_admin, is_super_admin, is_programs_admin, is_jjwl_admin, is_grants_reviewer')
    .eq('auth_id', user!.id)
    .maybeSingle()

  const dbSuperAdmin = superAdmin || !!self?.is_super_admin
  const isMemberAdmin = dbSuperAdmin || !!self?.is_admin
  const isProgramsAdmin = dbSuperAdmin || !!self?.is_programs_admin

  const admin = db()
  const currentYear = new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]

  // Fetch data in parallel, gated by role
  const [
    familiesRes,
    childrenRes,
    schoolsRes,
    pendingMembersRes,
    notificationsRes,
    grantApplicationsRes,
    jjwlMembersRes,
    jwlMembersRes,
    upcomingMeetingRes,
  ] = await Promise.all([
    isProgramsAdmin ? admin.from('families').select('id, status') : Promise.resolve({ data: null }),
    isProgramsAdmin ? admin.from('children').select('id, family_id, families(status, schools(name, districts(name)))') : Promise.resolve({ data: null }),
    isProgramsAdmin ? admin.from('schools').select('id, name, districts(name)').order('name') : Promise.resolve({ data: null }),
    isMemberAdmin ? admin.from('jwl_members').select('id, name, email').eq('status', 'pending').order('name') : Promise.resolve({ data: null }),
    isMemberAdmin ? admin.from('admin_notifications').select('id, message, created_at').eq('read', false).order('created_at', { ascending: false }) : Promise.resolve({ data: null }),
    admin.from('grant_applications').select('id, status').neq('status', 'draft'),
    admin.from('jjwl_members').select('id, status'),
    isMemberAdmin ? admin.from('jwl_members').select('id, status, dues_paid_through_year, join_year').eq('status', 'approved') : Promise.resolve({ data: null }),
    isMemberAdmin ? admin.from('jwl_meetings').select('id, title, meeting_date, meeting_time, location, status, jwl_meeting_rsvps(response)').eq('status', 'published').gte('meeting_date', today).order('meeting_date').limit(1) : Promise.resolve({ data: null }),
  ])

  // HC stats
  const families = familiesRes.data ?? []
  const approvedFamilies = families.filter(f => f.status === 'approved').length
  const submittedFamilies = families.filter(f => f.status === 'submitted').length
  const draftFamilies = families.filter(f => f.status === 'draft').length
  const children = childrenRes.data ?? []
  const approvedChildren = children.filter(c => (c.families as any)?.status === 'approved')
  const totalApprovedChildren = approvedChildren.length

  const bySchool: Record<string, { school: string; district: string; count: number }> = {}
  for (const child of approvedChildren) {
    const fam = child.families as any
    const schoolName = fam?.schools?.name ?? 'Unknown'
    const districtName = fam?.schools?.districts?.name ?? ''
    if (!bySchool[schoolName]) bySchool[schoolName] = { school: schoolName, district: districtName, count: 0 }
    bySchool[schoolName].count++
  }
  const schoolRows = Object.values(bySchool).sort((a, b) => b.count - a.count)

  // JJWL stats
  const jjwlMembers = jjwlMembersRes.data ?? []
  const pendingJjwl = jjwlMembers.filter(m => m.status === 'pending_approval').length
  const activeJjwl = jjwlMembers.filter(m => m.status === 'active').length

  // Grants stats
  const grantApplications = grantApplicationsRes.data ?? []
  const openGrants = grantApplications.filter(g => ['submitted', 'needs_more_info', 'under_review'].includes(g.status)).length
  const totalGrants = grantApplications.length

  // Membership stats
  const jwlMembers = jwlMembersRes.data ?? []
  const totalMembers = jwlMembers.length
  const overdueMembers = jwlMembers.filter(m => {
    const paidThrough = m.dues_paid_through_year ?? 0
    const joinYear = m.join_year ?? 0
    const onGrace = joinYear > 0 && joinYear + 1 >= currentYear
    return !onGrace && paidThrough < currentYear
  }).length

  const pendingMembers = pendingMembersRes.data ?? []
  const notifications = notificationsRes.data ?? []
  const upcomingMeeting = (upcomingMeetingRes.data ?? [])[0] ?? null

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>

      {/* ── Membership section ─────────────────────────── */}
      {isMemberAdmin && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Membership</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Active members" value={totalMembers} color="blue" href="/admin/members" />
            <StatCard label="Pending approval" value={pendingMembers.length} color={pendingMembers.length > 0 ? 'amber' : 'gray'} href="/admin/members" />
            <StatCard label="Dues overdue" value={overdueMembers} color={overdueMembers > 0 ? 'red' : 'gray'} href="/admin/members" />
            <StatCard label="JJWL active" value={activeJjwl} color="teal" href="/admin/jjwl" />
          </div>

          {/* Pending member approvals */}
          {pendingMembers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-800">Members awaiting approval ({pendingMembers.length})</h3>
                <Link href="/admin/members" className="text-xs text-amber-700 hover:underline font-medium">Manage all →</Link>
              </div>
              <div className="space-y-2">
                {pendingMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{m.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{m.email}</span>
                    </div>
                    <Link href="/admin/members" className="text-xs text-blue-600 hover:underline">Review</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming meeting */}
          {upcomingMeeting && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Next meeting</p>
                <p className="font-semibold text-gray-900">{upcomingMeeting.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(upcomingMeeting.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}{upcomingMeeting.location}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {(upcomingMeeting.jwl_meeting_rsvps as any[]).filter(r => r.response === 'yes').length} attending
                </p>
              </div>
              <Link href="/admin/meetings" className="text-sm text-[#1B52C1] hover:underline whitespace-nowrap">All meetings →</Link>
            </div>
          )}

          {/* Membership quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickLink href="/admin/meetings" title="Meetings" desc="Schedule meetings, send invites, post recaps" />
            <QuickLink href="/admin/members" title="Members" desc="Approve, manage dues and positions" />
            <QuickLink href="/admin/member-positions" title="Positions" desc="Configure the position dropdown options" />
          </div>
        </section>
      )}

      {/* ── Holiday Charities section ───────────────────── */}
      {isProgramsAdmin && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Holiday Charities</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Approved children" value={totalApprovedChildren} color="green" href="/admin/children" />
            <StatCard label="Approved families" value={approvedFamilies} color="green" href="/admin/families" />
            <StatCard label="Awaiting approval" value={submittedFamilies} color={submittedFamilies > 0 ? 'amber' : 'gray'} href="/admin/families" />
            <StatCard label="Draft families" value={draftFamilies} color="gray" href="/admin/families" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickLink href="/admin/children" title="Children" desc="View, filter, and assign approved children" />
            <QuickLink href="/admin/social-workers" title="Social Workers" desc="Review registrations and manage approvals" />
            <QuickLink href="/admin/broadcast" title="Broadcast" desc="Send season open and deadline reminder emails" />
            <QuickLink href="/admin/assignments" title="Assignments" desc="Assign children to JWL members" />
            <QuickLink href="/admin/setup" title="Districts & Schools" desc="Manage districts and schools" />
          </div>

          {/* Breakdown by school */}
          {schoolRows.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Approved children by school</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">School</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">District</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">Children</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schoolRows.map(row => (
                      <tr key={row.school}>
                        <td className="px-4 py-3 text-gray-900">{row.school}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{row.district}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{row.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{totalApprovedChildren}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Grants & JJWL ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Other programs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/grants/reviewer" className={`block rounded-xl border p-5 transition-colors hover:shadow-md ${openGrants > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'}`}>
            <p className="text-sm font-semibold text-gray-700">Grant Applications</p>
            <p className={`text-3xl font-bold mt-1 ${openGrants > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{openGrants}</p>
            <p className={`text-xs mt-0.5 ${openGrants > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              open{totalGrants > 0 ? ` · ${totalGrants} total` : ''}
            </p>
          </Link>
          <Link href="/admin/jjwl" className="block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-colors">
            <p className="text-sm font-semibold text-gray-700">JJWL</p>
            <p className="text-3xl font-bold mt-1 text-teal-700">{activeJjwl}</p>
            <p className="text-xs mt-0.5 text-gray-400">
              active{pendingJjwl > 0 ? ` · ${pendingJjwl} pending` : ''}
            </p>
          </Link>
        </div>
      </section>

      {/* ── Setup ──────────────────────────────────────── */}
      {isMemberAdmin && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Setup</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickLink href="/admin/email-preview" title="Email Templates" desc="Preview and test every system email" />
          </div>
        </section>
      )}

      {/* Notifications */}
      {notifications.length > 0 && <NotificationsList notifications={notifications} />}
    </div>
  )
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-700 bg-green-50 border-green-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red:   'text-red-700 bg-red-50 border-red-200',
    blue:  'text-blue-700 bg-blue-50 border-blue-200',
    teal:  'text-teal-700 bg-teal-50 border-teal-200',
    gray:  'text-gray-600 bg-gray-50 border-gray-200',
  }
  return (
    <Link href={href} className={`rounded-xl border p-4 block hover:shadow-sm transition-shadow ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </Link>
  )
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 transition-colors">
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </Link>
  )
}
