import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import NotificationsList from './NotificationsList'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminDashboard() {
  const supabase = adminClient()

  const [
    { data: families },
    { data: children },
    { data: schools },
    { data: pendingMembers },
    { data: notifications },
    { data: grantApplications },
  ] = await Promise.all([
    supabase.from('families').select('id, status, school_id, schools(name, districts(name))'),
    supabase.from('children').select('id, family_id, families(status, schools(name, districts(name)))'),
    supabase.from('schools').select('id, name, districts(name)').order('name'),
    supabase.from('jwl_members').select('id, name, email').eq('status', 'pending').order('name'),
    supabase.from('admin_notifications').select('id, message, created_at').eq('read', false).order('created_at', { ascending: false }),
    supabase.from('grant_applications').select('id, status').neq('status', 'draft'),
  ])

  const totalFamilies = families?.length ?? 0
  const approvedFamilies = families?.filter(f => f.status === 'approved').length ?? 0
  const submittedFamilies = families?.filter(f => f.status === 'submitted').length ?? 0
  const draftFamilies = families?.filter(f => f.status === 'draft').length ?? 0

  const approvedChildren = children?.filter(c => (c.families as any)?.status === 'approved') ?? []
  const totalApprovedChildren = approvedChildren.length

  // Break down approved children by school
  const bySchool: Record<string, { school: string; district: string; count: number }> = {}
  for (const child of approvedChildren) {
    const fam = child.families as any
    const schoolName = fam?.schools?.name ?? 'Unknown'
    const districtName = fam?.schools?.districts?.name ?? ''
    if (!bySchool[schoolName]) bySchool[schoolName] = { school: schoolName, district: districtName, count: 0 }
    bySchool[schoolName].count++
  }
  const schoolRows = Object.values(bySchool).sort((a, b) => b.count - a.count)

  const openGrants = (grantApplications ?? []).filter(g =>
    ['submitted', 'needs_more_info', 'under_review'].includes(g.status)
  ).length
  const totalGrants = grantApplications?.length ?? 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Approved children" value={totalApprovedChildren} color="green" />
        <StatCard label="Approved families" value={approvedFamilies} color="green" />
        <StatCard label="Awaiting approval" value={submittedFamilies} color="amber" />
        <StatCard label="Draft families" value={draftFamilies} color="gray" />
      </div>

      {/* Grants summary */}
      <Link href="/grants/reviewer" className="block">
        <div className={`rounded-xl border p-5 flex items-center justify-between transition-colors hover:shadow-md ${
          openGrants > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'
        }`}>
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Grant Applications</p>
            <p className={`text-3xl font-bold mt-1 ${openGrants > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
              {openGrants}
            </p>
            <p className={`text-xs mt-0.5 ${openGrants > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              open {totalGrants > 0 ? `· ${totalGrants} total` : ''}
            </p>
          </div>
          <span className={`text-sm font-medium ${openGrants > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            Review grants →
          </span>
        </div>
      </Link>

      {/* Pending JWL members */}
      {pendingMembers && pendingMembers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-amber-800">
              JWL Members awaiting approval ({pendingMembers.length})
            </h2>
            <Link href="/admin/members" className="text-xs text-amber-700 hover:underline font-medium">
              Manage all members →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-4 py-2.5">
                <div>
                  <span className="text-sm font-medium text-gray-900">{m.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{m.email}</span>
                </div>
                <Link href="/admin/members" className="text-xs text-blue-600 hover:underline">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member notifications */}
      {notifications && notifications.length > 0 && (
        <NotificationsList notifications={notifications} />
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/children" className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 transition-colors">
          <h2 className="font-medium text-gray-900 mb-1">Approved Children</h2>
          <p className="text-sm text-gray-500">View, filter, and assign children to JWL members</p>
        </Link>
        <Link href="/admin/social-workers" className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 transition-colors">
          <h2 className="font-medium text-gray-900 mb-1">Social Workers</h2>
          <p className="text-sm text-gray-500">Review registrations and manage approvals</p>
        </Link>
        <Link href="/admin/setup" className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 transition-colors">
          <h2 className="font-medium text-gray-900 mb-1">Districts &amp; Schools</h2>
          <p className="text-sm text-gray-500">Manage districts and schools</p>
        </Link>
        <Link href="/grants/reviewer" className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 transition-colors">
          <h2 className="font-medium text-gray-900 mb-1">Grants Portal</h2>
          <p className="text-sm text-gray-500">Review Charitable Children and Lift Fund applications</p>
        </Link>
      </div>

      {/* Breakdown by school */}
      {schoolRows.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Approved children by school</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">School</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">District</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Children</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schoolRows.map(row => (
                  <tr key={row.school}>
                    <td className="px-4 py-3 text-gray-900">{row.school}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.district}</td>
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
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-700 bg-green-50 border-green-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  )
}
