import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AttendanceActions from './AttendanceActions'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = db()

  const { data: evt } = await admin
    .from('jjwl_events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!evt) notFound()

  const { data: signups } = await admin
    .from('jjwl_signups')
    .select('id, status, time_slot, hours_awarded, signed_up_at, jjwl_members(id, name, phone, email)')
    .eq('event_id', id)
    .order('signed_up_at', { ascending: true })

  const totalSlots = evt.volunteer_slots_total
  const activeSignups = (signups ?? []).filter(s => ['signed_up', 'confirmed_attended', 'admin_added'].includes(s.status))
  const isSunset = evt.status === 'sunset'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <a href="/admin/jjwl/events" className="text-sm text-gray-400 hover:text-gray-600">← Back to events</a>
          <h1 className="text-xl font-semibold text-gray-900 mt-2">{evt.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            {evt.start_time && ` · ${evt.start_time.slice(0, 5)}`}
            {evt.end_time && `–${evt.end_time.slice(0, 5)}`}
            {' · '}{evt.location}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-xs px-2 py-1 rounded-full ${isSunset ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
            {evt.status}
          </span>
          <Link href={`/admin/jjwl/events/${id}/edit`}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600">
            Edit
          </Link>
        </div>
      </div>

      {/* Event stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{activeSignups.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            signed up{totalSlots > 0 ? ` / ${totalSlots} spots` : ''}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{Number(evt.credit_hours).toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-0.5">credit hours</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">
            {(signups ?? []).filter(s => s.status === 'confirmed_attended').length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">confirmed attended</p>
        </div>
      </div>

      {evt.description && (
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{evt.description}</p>
      )}

      {/* Signup roster */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Roster</h2>
          {isSunset && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
              Event has ended — confirm attendance below to award hours
            </p>
          )}
        </div>

        {(!signups || signups.length === 0) && (
          <p className="text-gray-400 text-sm py-4 text-center">No signups yet.</p>
        )}

        {(signups ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Member</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Contact</th>
                  {evt.time_slots && <th className="text-left px-4 py-3 text-gray-500 font-medium">Slot</th>}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  {isSunset && <th className="text-right px-4 py-3 text-gray-500 font-medium">Hours</th>}
                  {isSunset && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(signups ?? []).map((s: any) => {
                  const m = Array.isArray(s.jjwl_members) ? s.jjwl_members[0] : s.jjwl_members
                  return (
                    <tr key={s.id} className={s.status === 'cancelled' ? 'opacity-40' : ''}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/jjwl/members/${m?.id}`} className="font-medium text-[#1B52C1] hover:underline">
                          {m?.name ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {m?.phone && <p>{m.phone}</p>}
                        {m?.email && <p>{m.email}</p>}
                      </td>
                      {evt.time_slots && <td className="px-4 py-3 text-gray-600">{s.time_slot ?? '—'}</td>}
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      {isSunset && (
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {s.status === 'confirmed_attended' ? Number(s.hours_awarded ?? 0).toFixed(1) : '—'}
                        </td>
                      )}
                      {isSunset && (
                        <td className="px-4 py-3">
                          {['signed_up', 'admin_added'].includes(s.status) && (
                            <AttendanceActions
                              signupId={s.id}
                              eventId={evt.id}
                              creditHours={Number(evt.credit_hours)}
                            />
                          )}
                          {s.status === 'confirmed_attended' && (
                            <span className="text-xs text-green-600">✓ Confirmed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {isSunset && (
          <div className="mt-4">
            <AddAttendeeForm eventId={evt.id} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    signed_up: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-400',
    confirmed_attended: 'bg-green-100 text-green-700',
    no_show: 'bg-red-100 text-red-600',
    admin_added: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// Client component for adding attendee is defined separately
function AddAttendeeForm({ eventId }: { eventId: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">+ Add attendee who wasn't signed up</summary>
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500">Use the member search below and add them manually.</p>
        <a href={`/api/jjwl/admin/attendance?event_id=${eventId}`} className="text-xs text-[#1B52C1] hover:underline mt-1 block">
          Use Admin API to add by member ID
        </a>
      </div>
    </details>
  )
}
