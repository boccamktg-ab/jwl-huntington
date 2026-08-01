import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailEventShiftConfirmation } from '@/lib/email'

const BASE = 'https://portal.jwlhuntington.org'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getMember(userId: string) {
  const { data } = await db()
    .from('jwl_members')
    .select('id, name, email')
    .eq('auth_id', userId)
    .eq('status', 'approved')
    .single()
  return data ?? null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await getMember(user.id)
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 403 })

  const { shift_id } = await request.json()
  if (!shift_id) return NextResponse.json({ error: 'Missing shift_id' }, { status: 400 })

  // Check if already signed up
  const { data: existing } = await db()
    .from('jwl_meeting_shift_signups')
    .select('id')
    .eq('shift_id', shift_id)
    .eq('member_id', member.id)
    .maybeSingle()

  const { error } = await db()
    .from('jwl_meeting_shift_signups')
    .upsert({ shift_id, member_id: member.id }, { onConflict: 'shift_id,member_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send confirmation email on first signup (fire-and-forget)
  if (!existing && member.email) {
    const admin = db()
    const { data: shift } = await admin
      .from('jwl_meeting_shifts')
      .select('meeting_id')
      .eq('id', shift_id)
      .single()

    if (shift?.meeting_id) {
      const { data: meeting } = await admin
        .from('jwl_meetings')
        .select('title, meeting_date, location, jwl_meeting_shifts(id, label, start_time, end_time)')
        .eq('id', shift.meeting_id)
        .single()

      if (meeting) {
        const allShifts = ((meeting as any).jwl_meeting_shifts ?? []) as any[]
        const { data: mySignups } = await admin
          .from('jwl_meeting_shift_signups')
          .select('shift_id')
          .eq('member_id', member.id)
          .in('shift_id', allShifts.map((s: any) => s.id))

        const myShiftIds = new Set((mySignups ?? []).map((s: any) => s.shift_id))
        myShiftIds.add(shift_id)
        const myShifts = allShifts.filter((s: any) => myShiftIds.has(s.id))

        const { data: signupCounts } = await admin
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
        sendEmail({ to: member.email, subject, html }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await getMember(user.id)
  const memberId = member?.id
  if (!memberId) return NextResponse.json({ error: 'Member not found' }, { status: 403 })

  const { shift_id } = await request.json()
  if (!shift_id) return NextResponse.json({ error: 'Missing shift_id' }, { status: 400 })

  const { error } = await db()
    .from('jwl_meeting_shift_signups')
    .delete()
    .eq('shift_id', shift_id)
    .eq('member_id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
