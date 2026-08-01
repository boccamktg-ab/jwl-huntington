import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import MeetingRsvpButton from './MeetingRsvpButton'
import ShiftSignupButton from './ShiftSignupButton'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const dynamic = 'force-dynamic'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h % 12) || 12)}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default async function MemberMeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = db()

  const { data: member } = await admin
    .from('jwl_members')
    .select('id, name')
    .eq('auth_id', user!.id)
    .single()

  const { data: meetings } = await admin
    .from('jwl_meetings')
    .select(`
      id, title, meeting_date, meeting_time, end_time, location,
      agenda_notes, description, post_meeting_notes, meeting_type, status,
      jwl_meeting_rsvps ( id, response, member_id ),
      jwl_meeting_shifts (
        id, label, start_time, end_time, sort_order,
        jwl_meeting_shift_signups ( id, member_id )
      )
    `)
    .in('status', ['published', 'completed'])
    .order('meeting_date', { ascending: false })

  const rows = (meetings ?? []).map(m => {
    const myRsvp = (m.jwl_meeting_rsvps as any[]).find(r => r.member_id === member?.id)
    const yesCount = (m.jwl_meeting_rsvps as any[]).filter(r => r.response === 'yes').length
    const shifts = ((m.jwl_meeting_shifts ?? []) as any[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        ...s,
        signedUp: (s.jwl_meeting_shift_signups as any[]).some(ss => ss.member_id === member?.id),
        signupCount: (s.jwl_meeting_shift_signups as any[]).length,
      }))
    return { ...m, myRsvp: myRsvp?.response ?? null, yesCount, shifts }
  })

  const upcoming = rows.filter(r => r.status === 'published')
  const past = rows.filter(r => r.status === 'completed')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Meetings &amp; Events</h1>

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming</h2>
          {upcoming.map(m => (
            <MeetingCard key={m.id} meeting={m} memberId={member?.id ?? ''} />
          ))}
        </section>
      )}

      {upcoming.length === 0 && (
        <p className="text-sm text-gray-400">No upcoming meetings or events scheduled.</p>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past</h2>
          {past.map(m => (
            <MeetingCard key={m.id} meeting={m} memberId={member?.id ?? ''} past />
          ))}
        </section>
      )}
    </div>
  )
}

function MeetingCard({ meeting, memberId, past }: { meeting: any; memberId: string; past?: boolean }) {
  const isEvent = meeting.meeting_type === 'event'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
              {isEvent ? 'Event' : 'Meeting'}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900">{meeting.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {fmtDate(meeting.meeting_date)}
            {' · '}{fmtTime(meeting.meeting_time)}{meeting.end_time ? ` – ${fmtTime(meeting.end_time)}` : ''}
          </p>
          <p className="text-sm text-gray-500">📍 {meeting.location}</p>
        </div>
        {!past && !isEvent && (
          <MeetingRsvpButton meetingId={meeting.id} currentResponse={meeting.myRsvp} />
        )}
        {past && meeting.myRsvp === 'yes' && !isEvent && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium shrink-0">Attended</span>
        )}
      </div>

      {/* Description */}
      {meeting.description && !past && (
        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {meeting.description}
        </div>
      )}

      {/* Agenda (fallback when no description) */}
      {meeting.agenda_notes && !meeting.description && !past && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Agenda highlights</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{meeting.agenda_notes}</p>
        </div>
      )}

      {/* Shifts for events */}
      {isEvent && !past && meeting.shifts?.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sign up for a shift</p>
          </div>
          <div className="divide-y divide-gray-100">
            {meeting.shifts.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500">{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{s.signupCount} signed up</span>
                  <ShiftSignupButton shiftId={s.id} signedUp={s.signedUp} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meeting.post_meeting_notes && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Recap</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{meeting.post_meeting_notes}</p>
        </div>
      )}

      {!isEvent && (meeting.yesCount > 0) && (
        <p className="text-xs text-gray-400">
          {meeting.yesCount} member{meeting.yesCount !== 1 ? 's' : ''} {past ? 'attended' : 'attending'}
        </p>
      )}
    </div>
  )
}
