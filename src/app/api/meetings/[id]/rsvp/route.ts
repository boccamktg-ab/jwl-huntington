import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { sendEmail, emailMeetingRsvpConfirmation } from '@/lib/email'

const BASE = 'https://portal.jwlhuntington.org'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: meeting_id } = await params

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { response } = await request.json()
  if (response !== 'yes' && response !== 'no') {
    return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
  }

  const admin = db()

  const { data: member } = await admin
    .from('jwl_members')
    .select('id, name, email')
    .eq('auth_id', user.id)
    .eq('status', 'approved')
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Check prior response before upserting
  const { data: existing } = await admin
    .from('jwl_meeting_rsvps')
    .select('response, token')
    .eq('meeting_id', meeting_id)
    .eq('member_id', member.id)
    .maybeSingle()

  const wasAlreadyYes = existing?.response === 'yes'

  const { error } = await admin
    .from('jwl_meeting_rsvps')
    .upsert(
      { meeting_id, member_id: member.id, response, updated_at: new Date().toISOString() },
      { onConflict: 'meeting_id,member_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Confirmation email on new yes
  if (response === 'yes' && !wasAlreadyYes && member.email) {
    const { data: meeting } = await admin
      .from('jwl_meetings')
      .select('title, meeting_date, meeting_time, location')
      .eq('id', meeting_id)
      .single()

    const { data: others } = await admin
      .from('jwl_meeting_rsvps')
      .select('jwl_members(name)')
      .eq('meeting_id', meeting_id)
      .eq('response', 'yes')
      .neq('member_id', member.id)

    const attendees = (others ?? []).map((r: any) =>
      Array.isArray(r.jwl_members) ? r.jwl_members[0]?.name : r.jwl_members?.name
    ).filter(Boolean)

    if (meeting) {
      const noUrl = existing?.token
        ? `${BASE}/api/meetings/rsvp/${existing.token}?response=no`
        : `${BASE}/members/meetings`
      const { subject, html } = emailMeetingRsvpConfirmation(
        member.name, meeting.title, meeting.meeting_date,
        meeting.meeting_time, meeting.location, attendees, noUrl,
      )
      await sendEmail({ to: member.email, subject, html })
    }
  }

  return NextResponse.json({ ok: true })
}
