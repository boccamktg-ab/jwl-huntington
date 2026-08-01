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

function shiftSignupUrl(token: string) {
  return `${BASE}/api/meetings/shift-signup/${token}`
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

// Seed one invite token per member per shift for one-click email sign-up
async function ensureShiftTokens(meetingId: string, shiftIds: string[]) {
  if (!shiftIds.length) return
  const supabase = db()
  const { data: members } = await supabase
    .from('jwl_members')
    .select('id')
    .eq('status', 'approved')

  for (const m of members ?? []) {
    for (const shiftId of shiftIds) {
      await supabase
        .from('jwl_shift_invite_tokens')
        .upsert({ shift_id: shiftId, member_id: m.id }, { onConflict: 'shift_id,member_id', ignoreDuplicates: true })
    }
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
    .select('*, jwl_meeting_shifts(id, label, start_time, end_time, sort_order)')
    .eq('id', meeting_id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const isEvent = (meeting as any).meeting_type === 'event'
  const shifts = ((meeting as any).jwl_meeting_shifts ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  // Ensure every member has an RSVP token row (used for meetings and as auth for events)
  await ensureRsvpTokens(meeting_id)

  // For events, seed one-click shift invite tokens
  if (isEvent && shifts.length > 0) {
    await ensureShiftTokens(meeting_id, shifts.map((s: any) => s.id))
  }

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
      await supabase.from('jwl_meetings').update({ status: 'published' }).eq('id', meeting_id)

      // For events: fetch this member's per-shift tokens
      let shiftsWithTokens = shifts
      if (isEvent && shifts.length > 0) {
        const { data: tokens } = await supabase
          .from('jwl_shift_invite_tokens')
          .select('shift_id, token')
          .eq('member_id', rsvp.member_id)
          .in('shift_id', shifts.map((s: any) => s.id))

        const tokenMap = Object.fromEntries((tokens ?? []).map((t: any) => [t.shift_id, t.token]))
        shiftsWithTokens = shifts.map((s: any) => ({
          ...s,
          signupUrl: tokenMap[s.id] ? shiftSignupUrl(tokenMap[s.id]) : null,
        }))
      }

      payload = emailMeetingPublished(
        member.name, meeting.meeting_date, meeting.meeting_time,
        meeting.location, meeting.agenda_notes,
        rsvpUrl(rsvp.token, 'yes'), rsvpUrl(rsvp.token, 'no'),
        {
          title: meeting.title,
          description: (meeting as any).description,
          meetingType: (meeting as any).meeting_type ?? 'meeting',
          shifts: shiftsWithTokens,
          portalUrl: `${BASE}/members/meetings`,
        }
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
      await supabase.from('jwl_meetings').update({ status: 'completed' }).eq('id', meeting_id)
    }

    if (payload) {
      await sendEmail({ to: member.email, subject: payload.subject, html: payload.html })
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
