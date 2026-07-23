import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const STATUS_ORDER = ['pending_approval', 'approved_unpaid', 'active', 'inactive']
const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending',
  approved_unpaid: 'Awaiting Payment',
  active: 'Active',
  inactive: 'Inactive',
}
const STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700',
  approved_unpaid: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-400',
}

export default async function AdminJJWLMembersPage() {
  const admin = db()

  const { data: members } = await admin
    .from('jjwl_members')
    .select('id, name, email, grade, status, membership_paid, created_at, schools(name)')
    .order('created_at', { ascending: false })

  // Hour totals per member
  const { data: signups } = await admin
    .from('jjwl_signups')
    .select('member_id, hours_awarded')
    .eq('status', 'confirmed_attended')

  const { data: adjustments } = await admin
    .from('jjwl_hour_adjustments')
    .select('member_id, delta')

  const hoursMap: Record<string, number> = {}
  for (const s of signups ?? []) {
    hoursMap[s.member_id] = (hoursMap[s.member_id] ?? 0) + Number(s.hours_awarded ?? 0)
  }
  for (const a of adjustments ?? []) {
    hoursMap[a.member_id] = (hoursMap[a.member_id] ?? 0) + Number(a.delta)
  }

  const sorted = [...(members ?? [])].sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">JJWL Members</h1>
        <span className="text-sm text-gray-500">{(members ?? []).filter(m => m.status === 'active').length} active</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Grade / School</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Hours</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((m: any) => {
              const school = Array.isArray(m.schools) ? m.schools[0] : m.schools
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/jjwl/members/${m.id}`} className="font-medium text-[#1B52C1] hover:underline">
                      {m.name}
                    </Link>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>Grade {m.grade}</p>
                    {school && <p className="text-xs text-gray-400">{school.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status]}`}>
                      {STATUS_LABELS[m.status]}
                    </span>
                    {m.status === 'approved_unpaid' && !m.membership_paid && (
                      <p className="text-xs text-amber-600 mt-0.5">Payment pending</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {(hoursMap[m.id] ?? 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!members || members.length === 0) && (
          <p className="text-center text-gray-400 py-8">No members yet.</p>
        )}
      </div>
    </div>
  )
}
