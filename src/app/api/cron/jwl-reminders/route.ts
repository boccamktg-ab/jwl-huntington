import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendEmail,
  emailMeetingReminderFull,
  emailEventReminderFull,
} from '@/lib/email'

const BASE = 'https://portal.jwlhuntington.org'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function dateInNDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = db()
  let totalSent = 0

  for (const daysOut of [7, 1]) {
    const targetDate = dateInNDays(daysOut)

    const { data: meetings } = await admin
      .from('jwl_meetings')
      .select('id, title, meeting_date, meeting_time, location, meeting_type, jwl_meeting_shifts(id, label, start_time, end_time)')
      .eq('status', 'published')
      .eq('meeting_date', targetDate)

    for (const meeting of meetings ?? []) {
      const isEvent = (meeting as any).meeting_type === 'event'
      const allShifts = ((meeting as any).jwl_meeting_shifts ?? []) as any[]

      if (isEvent) {
        // For events: send to members who have at least one shift signup
        const { data: signups } = await admin
          .from('jwl_meeting_shift_signups')
          .select('member_id, shift_id, jwl_members(id, name, email)')
          .in('shift_id', allShifts.map((s: any) => s.id))

        // Group signups by member
        const memberSignups: Record<string, { member: any; shiftIds: Set<string> }> = {}
        for (const s of signups ?? []) {
          const m = Array.isArray(s.jwl_members) ? s.jwl_members[0] : s.jwl_members
          if (!m?.email) continue
          if (!memberSignups[m.id]) memberSignups[m.id] = { member: m, shiftIds: new Set() }
          memberSignups[m.id].shiftIds.add(s.shift_id)
        }

        // Signup counts per shift
        const countMap: Record<string, number> = {}
        for (const s of signups ?? []) countMap[s.shift_id] = (countMap[s.shift_id] ?? 0) + 1
        const allShiftCounts = allShifts.map((s: any) => ({ label: s.label, count: countMap[s.id] ?? 0 }))

        for (const { member, shiftIds } of Object.values(memberSignups)) {
          const myShifts = allShifts.filter((s: any) => shiftIds.has(s.id))
          const { subject, html } = emailEventReminderFull(
            member.name, meeting.title, formatDate(meeting.meeting_date),
            meeting.location, myShifts, allShiftCounts, daysOut,
          )
          const result = await sendEmail({ to: member.email, subject, html })
          if (result.success) totalSent++
        }
      } else {
        // For meetings: send to members who RSVPd yes
        const { data: rsvps } = await admin
          .from('jwl_meeting_rsvps')
          .select('member_id, token, jwl_members(id, name, email)')
          .eq('meeting_id', meeting.id)
          .eq('response', 'yes')

        // Build attendee list
        const attendees = (rsvps ?? []).map((r: any) => {
          const m = Array.isArray(r.jwl_members) ? r.jwl_members[0] : r.jwl_members
          return m?.name
        }).filter(Boolean)

        for (const rsvp of rsvps ?? []) {
          const member = Array.isArray(rsvp.jwl_members) ? rsvp.jwl_members[0] : rsvp.jwl_members
          if (!member?.email) continue

          const rsvpYesUrl = rsvp.token ? `${BASE}/api/meetings/rsvp/${rsvp.token}?response=yes` : `${BASE}/members/meetings`
          const rsvpNoUrl = rsvp.token ? `${BASE}/api/meetings/rsvp/${rsvp.token}?response=no` : `${BASE}/members/meetings`

          const { subject, html } = emailMeetingReminderFull(
            member.name, meeting.title, formatDate(meeting.meeting_date),
            meeting.meeting_time, meeting.location, attendees, daysOut,
            rsvpYesUrl, rsvpNoUrl,
          )
          const result = await sendEmail({ to: member.email, subject, html })
          if (result.success) totalSent++
        }
      }
    }
  }

  return NextResponse.json({ sent: totalSent })
}
