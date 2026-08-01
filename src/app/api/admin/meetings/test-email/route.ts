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

  const shifts = ((meeting as any).jwl_meeting_shifts ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  const payload = emailMeetingPublished(
    memberName,
    meeting.meeting_date, meeting.meeting_time,
    meeting.location, meeting.agenda_notes,
    `${BASE}/members/meetings`, `${BASE}/members/meetings`,
    {
      title: meeting.title,
      description: (meeting as any).description,
      meetingType: (meeting as any).meeting_type ?? 'meeting',
      shifts,
      portalUrl: `${BASE}/members/meetings`,
    }
  )

  await sendEmail({ to: user.email, subject: `[TEST] ${payload.subject}`, html: payload.html })

  return NextResponse.json({ ok: true, sent_to: user.email })
}
