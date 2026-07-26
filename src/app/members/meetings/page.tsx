import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import MeetingRsvpButton from './MeetingRsvpButton'

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
      id, title, meeting_date, meeting_time, location, agenda_notes, post_meeting_notes, status,
      jwl_meeting_rsvps ( id, response, member_id )
    `)
    .in('status', ['published', 'completed'])
    .order('meeting_date', { ascending: false })

  const rows = (meetings ?? []).map(m => {
    const myRsvp = (m.jwl_meeting_rsvps as any[]).find(r => r.member_id === member?.id)
    const yesCount = (m.jwl_meeting_rsvps as any[]).filter(r => r.response === 'yes').length
    return { ...m, myRsvp: myRsvp?.response ?? null, yesCount }
  })

  const upcoming = rows.filter(r => r.status === 'published')
  const past = rows.filter(r => r.status === 'completed')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming</h2>
          {upcoming.map(m => (
            <MeetingCard key={m.id} meeting={m} memberId={member?.id ?? ''} />
          ))}
        </section>
      )}

      {upcoming.length === 0 && (
        <p className="text-sm text-gray-400">No upcoming meetings scheduled.</p>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past meetings</h2>
          {past.map(m => (
            <MeetingCard key={m.id} meeting={m} memberId={member?.id ?? ''} past />
          ))}
        </section>
      )}
    </div>
  )
}

function MeetingCard({ meeting, memberId, past }: { meeting: any; memberId: string; past?: boolean }) {
  const attendees = (meeting.jwl_meeting_rsvps as any[]).filter(r => r.response === 'yes')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{meeting.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{fmtDate(meeting.meeting_date)} at {fmtTime(meeting.meeting_time)}</p>
          <p className="text-sm text-gray-500">📍 {meeting.location}</p>
        </div>
        {!past && (
          <MeetingRsvpButton meetingId={meeting.id} currentResponse={meeting.myRsvp} />
        )}
        {past && meeting.myRsvp === 'yes' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium shrink-0">Attended</span>
        )}
      </div>

      {meeting.agenda_notes && !past && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Agenda highlights</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{meeting.agenda_notes}</p>
        </div>
      )}

      {meeting.post_meeting_notes && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Meeting recap</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{meeting.post_meeting_notes}</p>
        </div>
      )}

      {attendees.length > 0 && (
        <p className="text-xs text-gray-400">
          {attendees.length} member{attendees.length !== 1 ? 's' : ''} {past ? 'attended' : 'attending'}
        </p>
      )}
    </div>
  )
}
