import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as serverClient } from '@/lib/supabase/server'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailMeetingPublished } from '@/lib/email'

const BASE = 'https://portal.jwlhuntington.org'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const actor = await requireAdminFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { meeting_id } = await request.json()
  if (!meeting_id) return NextResponse.json({ error: 'Missing meeting_id' }, { status: 400 })

  const supabase = db()

  const { data: meeting } = await supabase
    .from('jwl_meetings')
    .select('*, jwl_meeting_shifts(id, label, start_time, end_time, sort_order)')
    .eq('id', meeting_id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  // Get the calling user's email from their session
  const srv = await serverClient()
  const { data: { user } } = await srv.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'No user email' }, { status: 400 })

  const { data: member } = await supabase
    .from('jwl_members')
    .select('name')
    .eq('auth_id', user.id)
    .maybeSingle()

  const memberName = member?.name ?? user.email

  // Get the member's id for token lookup
  const { data: memberRow } = await supabase
    .from('jwl_members')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()

  const isEvent = (meeting as any).meeting_type === 'event'
  let shifts = ((meeting as any).jwl_meeting_shifts ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  // Attach one-click tokens if available
  if (isEvent && memberRow?.id && shifts.length > 0) {
    // Seed tokens for this member if not yet seeded
    for (const s of shifts) {
      await supabase
        .from('jwl_shift_invite_tokens')
        .upsert({ shift_id: s.id, member_id: memberRow.id }, { onConflict: 'shift_id,member_id', ignoreDuplicates: true })
    }
    const { data: tokens } = await supabase
      .from('jwl_shift_invite_tokens')
      .select('shift_id, token')
      .eq('member_id', memberRow.id)
      .in('shift_id', shifts.map((s: any) => s.id))

    const tokenMap = Object.fromEntries((tokens ?? []).map((t: any) => [t.shift_id, t.token]))
    shifts = shifts.map((s: any) => ({
      ...s,
      signupUrl: tokenMap[s.id] ? `${BASE}/api/meetings/shift-signup/${tokenMap[s.id]}` : null,
    }))
  }

  const payload = emailMeetingPublished(
    memberName,
    meeting.meeting_date, meeting.meeting_time,
    meeting.location, meeting.agenda_notes,
    `${BASE}/members/meetings`, `${BASE}/members/meetings`,
    {
      title: meeting.title,
      description: (meeting as any).description,
      meetingType: isEvent ? 'event' : 'meeting',
      shifts,
      portalUrl: `${BASE}/members/meetings`,
    }
  )

  await sendEmail({ to: user.email, subject: `[TEST] ${payload.subject}`, html: payload.html })

  return NextResponse.json({ ok: true, sent_to: user.email })
}
