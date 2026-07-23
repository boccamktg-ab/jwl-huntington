import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import Link from 'next/link'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function programYear(date: Date): string {
  const m = date.getMonth() // 0-indexed
  const y = date.getFullYear()
  // Aug (7) – May (4) => year starts Aug 1
  const startYear = m >= 7 ? y : y - 1
  return `${startYear}–${String(startYear + 1).slice(2)}`
}

function currentYearBounds() {
  const now = new Date()
  const m = now.getMonth()
  const y = now.getFullYear()
  const startYear = m >= 7 ? y : y - 1
  return {
    start: new Date(`${startYear}-08-01`),
    end: new Date(`${startYear + 1}-05-31T23:59:59`),
    label: `${startYear}–${String(startYear + 1).slice(2)}`,
  }
}

export default async function JJWLDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = db()

  const { data: member } = await admin
    .from('jjwl_members')
    .select('id, name, grade, status, schools(name)')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member || member.status !== 'active') redirect('/jjwl/pending')

  // All confirmed signups + hour adjustments
  const [{ data: signups }, { data: adjustments }] = await Promise.all([
    admin
      .from('jjwl_signups')
      .select('id, hours_awarded, confirmed_at, jjwl_events(id, title, event_date, credit_hours)')
      .eq('member_id', member.id)
      .eq('status', 'confirmed_attended')
      .order('confirmed_at', { ascending: false }),
    admin
      .from('jjwl_hour_adjustments')
      .select('id, delta, reason, adjusted_at')
      .eq('member_id', member.id)
      .order('adjusted_at', { ascending: false }),
  ])

  const { start, end, label: yearLabel } = currentYearBounds()

  const allTimeHours = (signups ?? []).reduce((sum, s) => sum + Number(s.hours_awarded ?? 0), 0)
    + (adjustments ?? []).reduce((sum, a) => sum + Number(a.delta), 0)

  const currentYearHours = (signups ?? [])
    .filter(s => {
      const evt = Array.isArray(s.jjwl_events) ? s.jjwl_events[0] : s.jjwl_events
      if (!evt?.event_date) return false
      const d = new Date(evt.event_date)
      return d >= start && d <= end
    })
    .reduce((sum, s) => sum + Number(s.hours_awarded ?? 0), 0)
    + (adjustments ?? [])
      .filter(a => {
        const d = new Date(a.adjusted_at)
        return d >= start && d <= end
      })
      .reduce((sum, a) => sum + Number(a.delta), 0)

  // Upcoming signups (active events, not yet confirmed)
  const { data: upcoming } = await admin
    .from('jjwl_signups')
    .select('id, time_slot, jjwl_events(id, title, event_date, location, start_time)')
    .eq('member_id', member.id)
    .eq('status', 'signed_up')
    .order('jjwl_events(event_date)', { ascending: true })

  const school = Array.isArray(member.schools) ? member.schools[0] : member.schools

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome, {member.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Grade {member.grade}{school ? ` · ${(school as any).name}` : ''}
        </p>
      </div>

      {/* Hour totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1B52C1] text-white rounded-2xl p-6">
          <p className="text-3xl font-bold">{currentYearHours.toFixed(1)}</p>
          <p className="text-sm text-blue-200 mt-1">{yearLabel} program year</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-3xl font-bold text-gray-900">{allTimeHours.toFixed(1)}</p>
          <p className="text-sm text-gray-500 mt-1">All-time hours</p>
        </div>
      </div>

      {/* Certificate download */}
      <div className="flex gap-3">
        <a
          href={`/api/jjwl/certificate?year=${yearLabel}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-[#1B52C1] hover:text-[#1B52C1] transition-colors"
        >
          📄 Download Certificate ({yearLabel})
        </a>
        <Link
          href="/jjwl/events"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-[#1B52C1] text-white rounded-lg hover:bg-[#1540A0] transition-colors"
        >
          Browse Events →
        </Link>
      </div>

      {/* Upcoming signups */}
      {upcoming && upcoming.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Your Upcoming Events</h2>
          <div className="space-y-3">
            {upcoming.map((s: any) => {
              const evt = Array.isArray(s.jjwl_events) ? s.jjwl_events[0] : s.jjwl_events
              if (!evt) return null
              return (
                <Link
                  key={s.id}
                  href={`/jjwl/events/${evt.id}`}
                  className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-[#1B52C1] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{evt.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        {evt.start_time && ` · ${evt.start_time.slice(0, 5)}`}
                        {evt.location && ` · ${evt.location}`}
                      </p>
                      {s.time_slot && <p className="text-xs text-gray-400 mt-0.5">Slot: {s.time_slot}</p>}
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full shrink-0">Signed up</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Participation history */}
      {signups && signups.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Participation History</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Event</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {signups.map((s: any) => {
                  const evt = Array.isArray(s.jjwl_events) ? s.jjwl_events[0] : s.jjwl_events
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-gray-900">{evt?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {evt?.event_date
                          ? new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {Number(s.hours_awarded ?? 0).toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual adjustments */}
      {adjustments && adjustments.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Manual Adjustments</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Reason</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adjustments.map((a: any) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-gray-700">{a.reason}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(a.adjusted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(a.delta) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {Number(a.delta) >= 0 ? '+' : ''}{Number(a.delta).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!signups || signups.length === 0) && (!adjustments || adjustments.length === 0) && (!upcoming || upcoming.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No activity yet.</p>
          <p className="text-sm mt-1">Browse <Link href="/jjwl/events" className="text-[#1B52C1] hover:underline">upcoming events</Link> to get started.</p>
        </div>
      )}
    </div>
  )
}
