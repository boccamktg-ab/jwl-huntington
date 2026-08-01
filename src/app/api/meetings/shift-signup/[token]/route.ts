import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailEventShiftConfirmation } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const BASE = 'https://portal.jwlhuntington.org'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = db()

  // Look up the token → shift + member
  const { data: invite } = await supabase
    .from('jwl_shift_invite_tokens')
    .select('shift_id, member_id, jwl_meeting_shifts(id, label, start_time, end_time, meeting_id), jwl_members(name, email)')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.redirect(`${BASE}/members/meetings?notice=invalid_token`)
  }

  const shift = Array.isArray(invite.jwl_meeting_shifts) ? invite.jwl_meeting_shifts[0] : invite.jwl_meeting_shifts
  const member = Array.isArray(invite.jwl_members) ? invite.jwl_members[0] : invite.jwl_members

  // Sign them up (ignore if already signed up)
  const { data: existing } = await supabase
    .from('jwl_meeting_shift_signups')
    .select('id')
    .eq('shift_id', invite.shift_id)
    .eq('member_id', invite.member_id)
    .maybeSingle()

  const isNew = !existing
  await supabase
    .from('jwl_meeting_shift_signups')
    .upsert({ shift_id: invite.shift_id, member_id: invite.member_id }, { onConflict: 'shift_id,member_id', ignoreDuplicates: true })

  // Send confirmation email on first signup
  if (isNew && member?.email && shift?.meeting_id) {
    const meetingId = shift.meeting_id

    // Fetch the meeting details
    const { data: meeting } = await supabase
      .from('jwl_meetings')
      .select('title, meeting_date, location, jwl_meeting_shifts(id, label, start_time, end_time)')
      .eq('id', meetingId)
      .single()

    if (meeting) {
      const allShifts = ((meeting as any).jwl_meeting_shifts ?? []) as any[]

      // All shifts this member is signed up for (including the one just signed up)
      const { data: mySignups } = await supabase
        .from('jwl_meeting_shift_signups')
        .select('shift_id')
        .eq('member_id', invite.member_id)
        .in('shift_id', allShifts.map((s: any) => s.id))

      const myShiftIds = new Set((mySignups ?? []).map((s: any) => s.shift_id))
      myShiftIds.add(invite.shift_id)
      const myShifts = allShifts.filter((s: any) => myShiftIds.has(s.id))

      // Current signup counts per shift
      const { data: signupCounts } = await supabase
        .from('jwl_meeting_shift_signups')
        .select('shift_id')
        .in('shift_id', allShifts.map((s: any) => s.id))

      const countMap: Record<string, number> = {}
      for (const s of signupCounts ?? []) {
        countMap[s.shift_id] = (countMap[s.shift_id] ?? 0) + 1
      }
      const allShiftCounts = allShifts.map((s: any) => ({ label: s.label, count: countMap[s.id] ?? 0 }))

      const { subject, html } = emailEventShiftConfirmation(
        member.name, meeting.title, meeting.meeting_date,
        meeting.location, myShifts, allShiftCounts,
      )
      await sendEmail({ to: member.email, subject, html })
    }
  }

  return NextResponse.redirect(`${BASE}/members/meetings?notice=shift_signup`)
}
