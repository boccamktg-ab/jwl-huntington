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

export default async function JJWLEventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = db()

  const { data: member } = await admin
    .from('jjwl_members')
    .select('id, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member || member.status !== 'active') redirect('/jjwl/pending')

  const [{ data: events }, { data: mySignups }] = await Promise.all([
    admin
      .from('jjwl_events')
      .select('id, title, location, event_date, start_time, end_time, volunteer_slots_total, credit_hours, description')
      .eq('status', 'active')
      .gte('event_date', new Date().toISOString().slice(0, 10))
      .order('event_date', { ascending: true }),
    admin
      .from('jjwl_signups')
      .select('event_id, status')
      .eq('member_id', member.id)
      .in('status', ['signed_up', 'confirmed_attended']),
  ])

  // Count current signups per event
  const { data: signupCounts } = await admin
    .from('jjwl_signups')
    .select('event_id')
    .in('status', ['signed_up', 'confirmed_attended'])

  const signupCountMap: Record<string, number> = {}
  for (const s of signupCounts ?? []) {
    signupCountMap[s.event_id] = (signupCountMap[s.event_id] ?? 0) + 1
  }

  const mySignupSet = new Set((mySignups ?? []).filter(s => s.status === 'signed_up').map(s => s.event_id))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Upcoming Events</h1>

      {(!events || events.length === 0) && (
        <p className="text-gray-400 py-8 text-center">No upcoming events at this time. Check back soon!</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(events ?? []).map((evt: any) => {
          const filled = signupCountMap[evt.id] ?? 0
          const full = evt.volunteer_slots_total > 0 && filled >= evt.volunteer_slots_total
          const isMine = mySignupSet.has(evt.id)

          return (
            <Link
              key={evt.id}
              href={`/jjwl/events/${evt.id}`}
              className={`block bg-white border rounded-2xl p-6 space-y-3 hover:shadow-md transition-all ${
                isMine ? 'border-[#1B52C1] ring-1 ring-[#1B52C1]/20' : 'border-gray-200 hover:border-[#1B52C1]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-gray-900">{evt.title}</h2>
                {isMine && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">Signed up</span>
                )}
                {!isMine && full && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full shrink-0">Full</span>
                )}
              </div>

              <div className="text-sm text-gray-500 space-y-0.5">
                <p>📅 {new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                {evt.start_time && <p>🕐 {evt.start_time.slice(0, 5)}{evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ''}</p>}
                <p>📍 {evt.location}</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  ⭐ {Number(evt.credit_hours).toFixed(1)} credit hour{evt.credit_hours !== 1 ? 's' : ''}
                </span>
                {evt.volunteer_slots_total > 0 && (
                  <span className={`text-xs ${full ? 'text-red-500' : 'text-gray-400'}`}>
                    {filled}/{evt.volunteer_slots_total} spots
                  </span>
                )}
              </div>

              {evt.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{evt.description}</p>
              )}

              <p className="text-sm font-medium text-[#1B52C1]">
                {isMine ? 'View details / cancel →' : (full ? 'View details →' : 'View & sign up →')}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
