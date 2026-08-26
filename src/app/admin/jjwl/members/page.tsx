import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import NudgePaymentButton from './NudgePaymentButton'
import NudgeWaiverButton from './NudgeWaiverButton'
import NudgeUnpaidButton from './NudgeUnpaidButton'
import NotifyCancelledButton from './NotifyCancelledButton'
import ApproveWaitlistButton from './ApproveWaitlistButton'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const STATUS_ORDER = ['waitlisted', 'pending_approval', 'approved_unpaid', 'active', 'inactive']
const STATUS_LABELS: Record<string, string> = {
  waitlisted: 'Waitlisted',
  pending_approval: 'Pending',
  approved_unpaid: 'Awaiting Payment',
  active: 'Active',
  inactive: 'Inactive',
}
const STATUS_COLORS: Record<string, string> = {
  waitlisted: 'bg-purple-100 text-purple-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved_unpaid: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-400',
}

type SortKey = 'name' | 'grade' | 'status' | 'hours' | 'registered'

function sortMembers(members: any[], hoursMap: Record<string, number>, sortKey: SortKey, dir: 'asc' | 'desc') {
  return [...members].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') {
      cmp = a.name.localeCompare(b.name)
    } else if (sortKey === 'grade') {
      cmp = Number(a.grade ?? 0) - Number(b.grade ?? 0)
    } else if (sortKey === 'status') {
      cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    } else if (sortKey === 'hours') {
      cmp = (hoursMap[a.id] ?? 0) - (hoursMap[b.id] ?? 0)
    } else if (sortKey === 'registered') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

function SortLink({ label, col, current, dir, align }: {
  label: string
  col: SortKey
  current: SortKey
  dir: 'asc' | 'desc'
  align?: string
}) {
  const active = current === col
  const nextDir = active && dir === 'asc' ? 'desc' : 'asc'
  const arrow = active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''
  return (
    <th className={`px-4 py-3 text-gray-500 font-medium ${align ?? 'text-left'}`}>
      <Link
        href={`?sort=${col}&dir=${nextDir}`}
        className={`hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}
      >
        {label}{arrow}
      </Link>
    </th>
  )
}

export default async function AdminJJWLMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>
}) {
  const params = await searchParams
  const sortKey = (['name', 'grade', 'status', 'hours', 'registered'].includes(params.sort ?? '')
    ? params.sort
    : 'status') as SortKey
  const dir = params.dir === 'desc' ? 'desc' : 'asc'

  const admin = db()

  const { data: members } = await admin
    .from('jjwl_members')
    .select('id, name, email, grade, status, membership_paid, created_at, schools(name)')

  const { data: signups } = await admin
    .from('jjwl_signups')
    .select('member_id, hours_awarded')
    .eq('status', 'confirmed_attended')

  const { data: adjustments } = await admin
    .from('jjwl_hour_adjustments')
    .select('member_id, delta')

  const SEASON = '2026-2027'
  const { data: waivers } = await admin
    .from('jjwl_waivers')
    .select('member_id')
    .eq('season', SEASON)

  const waiverSet = new Set((waivers ?? []).map(w => w.member_id))

  const hoursMap: Record<string, number> = {}
  for (const s of signups ?? []) {
    hoursMap[s.member_id] = (hoursMap[s.member_id] ?? 0) + Number(s.hours_awarded ?? 0)
  }
  for (const a of adjustments ?? []) {
    hoursMap[a.member_id] = (hoursMap[a.member_id] ?? 0) + Number(a.delta)
  }

  const sorted = sortMembers(members ?? [], hoursMap, sortKey, dir)

  const awaitingPaymentCount = (members ?? []).filter(m => m.status === 'approved_unpaid' && !m.membership_paid).length
  const waitlistedCount = (members ?? []).filter(m => m.status === 'waitlisted').length
  const activeTotal = (members ?? []).filter(m => !['inactive', 'waitlisted'].includes(m.status)).length
  const needsWaiverCount = (members ?? []).filter(m => m.status === 'active' && m.membership_paid && !waiverSet.has(m.id)).length
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const unpaidOldCount = (members ?? []).filter(m =>
    m.status === 'approved_unpaid' && !m.membership_paid && new Date(m.created_at) < sevenDaysAgo
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">JJWL Members</h1>
        <div className="flex items-center gap-3">
          <NotifyCancelledButton />
          <NudgeUnpaidButton count={unpaidOldCount} />
          <NudgeWaiverButton count={needsWaiverCount} />
          <NudgePaymentButton count={awaitingPaymentCount} />
          {waitlistedCount > 0 && (
            <span className="text-sm text-purple-600">{waitlistedCount} waitlisted</span>
          )}
          <span className="text-sm text-gray-500">{activeTotal} / 76 enrolled</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortLink label="Name" col="name" current={sortKey} dir={dir} />
              <SortLink label="Grade / School" col="grade" current={sortKey} dir={dir} />
              <SortLink label="Status" col="status" current={sortKey} dir={dir} />
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Waiver</th>
              <SortLink label="Hours" col="hours" current={sortKey} dir={dir} align="text-right" />
              <SortLink label="Registered" col="registered" current={sortKey} dir={dir} align="text-right" />
              <th className="px-4 py-3"></th>
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
                  <td className="px-4 py-3 text-center">
                    {waiverSet.has(m.id)
                      ? <span className="text-xs text-green-700 font-medium">✓ On file</span>
                      : <span className="text-xs text-amber-600">Pending</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {(hoursMap[m.id] ?? 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    {m.status === 'waitlisted' && (
                      <ApproveWaitlistButton memberId={m.id} />
                    )}
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
