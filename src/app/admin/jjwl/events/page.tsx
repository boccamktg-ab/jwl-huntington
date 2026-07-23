import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminJJWLEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filterSunset = params.filter === 'sunset'
  const admin = db()

  const query = admin
    .from('jjwl_events')
    .select('id, title, location, event_date, start_time, volunteer_slots_total, credit_hours, status')
    .order('event_date', { ascending: !filterSunset })

  if (filterSunset) {
    query.eq('status', 'sunset')
  }

  const { data: events } = await query

  // Signup counts
  const { data: allSignups } = await admin
    .from('jjwl_signups')
    .select('event_id')
    .in('status', ['signed_up', 'confirmed_attended'])

  const countMap: Record<string, number> = {}
  for (const s of allSignups ?? []) {
    countMap[s.event_id] = (countMap[s.event_id] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{filterSunset ? 'Past Events — Attendance Review' : 'Events'}</h1>
          {filterSunset && (
            <p className="text-sm text-gray-500 mt-0.5">Review signup lists and confirm attendance to award hours.</p>
          )}
        </div>
        <div className="flex gap-3">
          {filterSunset
            ? <Link href="/admin/jjwl/events" className="text-sm text-gray-500 hover:underline">Show upcoming</Link>
            : <Link href="/admin/jjwl/events?filter=sunset" className="text-sm text-gray-500 hover:underline">Show past</Link>
          }
          <Link href="/admin/jjwl/events/new"
            className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0]">
            + New Event
          </Link>
        </div>
      </div>

      {(!events || events.length === 0) && (
        <p className="text-gray-400 py-8 text-center">No events found.</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Event</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Location</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Signups</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Credits</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(events ?? []).map(evt => {
              const count = countMap[evt.id] ?? 0
              return (
                <tr key={evt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/jjwl/events/${evt.id}`} className="font-medium text-[#1B52C1] hover:underline">
                      {evt.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                    {evt.start_time && <span className="text-gray-400 ml-1">{evt.start_time.slice(0, 5)}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{evt.location}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {count}{evt.volunteer_slots_total > 0 ? `/${evt.volunteer_slots_total}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">{Number(evt.credit_hours).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      evt.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {evt.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
