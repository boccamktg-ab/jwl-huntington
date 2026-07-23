import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailEventReminder } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)
  const targetDate = in7Days.toISOString().slice(0, 10)

  // Find events happening exactly 7 days from now
  const admin = db()
  const { data: events } = await admin
    .from('jjwl_events')
    .select('id, title, location, event_date, start_time')
    .eq('status', 'active')
    .eq('event_date', targetDate)

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  for (const evt of events) {
    // Get all active signups for this event
    const { data: signups } = await admin
      .from('jjwl_signups')
      .select('id, jjwl_members(name, email)')
      .eq('event_id', evt.id)
      .eq('status', 'signed_up')

    for (const s of signups ?? []) {
      const member = Array.isArray(s.jjwl_members) ? s.jjwl_members[0] : s.jjwl_members
      if (!member?.email) continue

      const dateStr = new Date(evt.event_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
      })
      const { subject, html } = emailEventReminder(member.name, evt.title, dateStr, evt.location)
      const result = await sendEmail({ to: member.email, subject, html })

      await admin.from('jjwl_notifications_log').insert({
        trigger: 'event_reminder',
        recipient: member.email,
        event_id: evt.id,
        success: result.success,
        error: result.error ?? null,
      })

      if (result.success) sent++
    }
  }

  return NextResponse.json({ sent })
}
