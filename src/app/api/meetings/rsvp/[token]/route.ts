import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailMeetingRsvpConfirmation } from '@/lib/email'

const BASE = 'https://portal.jwlhuntington.org'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// One-click RSVP — no login required. Token is unique per member per meeting.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const response = request.nextUrl.searchParams.get('response')

  if (!token || (response !== 'yes' && response !== 'no')) {
    return new NextResponse('Invalid link.', { status: 400 })
  }

  const supabase = db()

  const { data: rsvp, error } = await supabase
    .from('jwl_meeting_rsvps')
    .select('id, meeting_id, member_id, response, jwl_meetings(id, title, meeting_date, meeting_time, location), jwl_members(name, email)')
    .eq('token', token)
    .single()

  if (error || !rsvp) {
    return new NextResponse('This RSVP link is invalid or has expired.', { status: 404 })
  }

  const wasAlreadyYes = rsvp.response === 'yes'

  await supabase
    .from('jwl_meeting_rsvps')
    .update({ response, updated_at: new Date().toISOString() })
    .eq('token', token)

  // Send confirmation only on a new yes (not if they were already yes)
  if (response === 'yes' && !wasAlreadyYes) {
    const meeting = (rsvp as any).jwl_meetings
    const member = (rsvp as any).jwl_members
    if (meeting && member?.email) {
      // Fetch other attendees
      const { data: others } = await supabase
        .from('jwl_meeting_rsvps')
        .select('jwl_members(name)')
        .eq('meeting_id', rsvp.meeting_id)
        .eq('response', 'yes')
        .neq('member_id', rsvp.member_id)
      const attendees = (others ?? []).map((r: any) =>
        Array.isArray(r.jwl_members) ? r.jwl_members[0]?.name : r.jwl_members?.name
      ).filter(Boolean)

      const noUrl = `${BASE}/api/meetings/rsvp/${token}?response=no`
      const { subject, html } = emailMeetingRsvpConfirmation(
        member.name, meeting.title, meeting.meeting_date,
        meeting.meeting_time, meeting.location, attendees, noUrl,
      )
      await sendEmail({ to: member.email, subject, html })
    }
  }

  const meeting = (rsvp as any).jwl_meetings
  const dateStr = meeting?.meeting_date
    ? new Date(meeting.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'the meeting'

  const noticeParam = response === 'yes' ? 'rsvp_yes' : 'rsvp_no'
  return NextResponse.redirect(`${BASE}/login?notice=${noticeParam}&meeting=${encodeURIComponent(dateStr)}`)
}
