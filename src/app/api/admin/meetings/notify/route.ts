import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailMeetingPublished, emailMeetingReminder, emailMeetingRecap } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const BASE = 'https://portal.jwlhuntington.org'

function rsvpUrl(token: string, response: 'yes' | 'no') {
  return `${BASE}/api/meetings/rsvp/${token}?response=${response}`
}

// Ensure all approved members have an RSVP row (with token) for this meeting
async function ensureRsvpTokens(meetingId: string) {
  const supabase = db()
  const { data: members } = await supabase
    .from('jwl_members')
    .select('id')
    .eq('status', 'approved')

  for (const m of members ?? []) {
    await supabase
      .from('jwl_meeting_rsvps')
      .upsert({ meeting_id: meetingId, member_id: m.id, response: 'no' }, { onConflict: 'meeting_id,member_id', ignoreDuplicates: true })
  }
}

export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { meeting_id, type } = await request.json()
  if (!meeting_id || !type) return NextResponse.json({ error: 'Missing meeting_id or type' }, { status: 400 })

  const supabase = db()

  const { data: meeting } = await supabase
    .from('jwl_meetings')
    .select('*')
    .eq('id', meeting_id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  // Ensure every member has an RSVP token row
  await ensureRsvpTokens(meeting_id)

  const { data: rsvps } = await supabase
    .from('jwl_meeting_rsvps')
    .select('token, response, member_id, jwl_members(name, email)')
    .eq('meeting_id', meeting_id)

  let sent = 0

  for (const rsvp of rsvps ?? []) {
    const member = (rsvp as any).jwl_members
    if (!member?.email) continue

    let payload: { subject: string; html: string } | null = null

    if (type === 'published') {
      // Mark meeting published first
      await supabase.from('jwl_meetings').update({ status: 'published' }).eq('id', meeting_id)
      payload = emailMeetingPublished(
        member.name, meeting.meeting_date, meeting.meeting_time,
        meeting.location, meeting.agenda_notes,
        rsvpUrl(rsvp.token, 'yes'), rsvpUrl(rsvp.token, 'no'),
      )
    } else if (type === 'reminder_7' || type === 'reminder_1') {
      if (rsvp.response === 'no') continue
      const daysOut = type === 'reminder_1' ? 1 : 7
      payload = emailMeetingReminder(
        member.name, meeting.meeting_date, meeting.meeting_time,
        meeting.location, rsvp.response === 'yes',
        rsvpUrl(rsvp.token, 'yes'), rsvpUrl(rsvp.token, 'no'), daysOut,
      )
    } else if (type === 'recap') {
      if (!meeting.post_meeting_notes) continue
      payload = emailMeetingRecap(member.name, meeting.meeting_date, meeting.post_meeting_notes)
      // Mark completed
      await supabase.from('jwl_meetings').update({ status: 'completed' }).eq('id', meeting_id)
    }

    if (payload) {
      await sendEmail({ to: member.email, subject: payload.subject, html: payload.html })
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
