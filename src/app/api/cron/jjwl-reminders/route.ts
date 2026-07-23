import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailMemberEventReminder } from '@/lib/email'

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

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = db()
  let totalSent = 0

  // Run for both 7-day and 2-day reminders
  for (const daysOut of [7, 2]) {
    const targetDate = dateInNDays(daysOut)

    const { data: events } = await admin
      .from('jjwl_events')
      .select('id, title, location, event_date, start_time, end_time')
      .eq('status', 'active')
      .eq('event_date', targetDate)

    for (const evt of events ?? []) {
      const { data: signups } = await admin
        .from('jjwl_signups')
        .select('id, time_slot, jjwl_members(name, email, parent_email)')
        .eq('event_id', evt.id)
        .eq('status', 'signed_up')

      for (const s of signups ?? []) {
        const member = Array.isArray(s.jjwl_members) ? s.jjwl_members[0] : s.jjwl_members
        if (!member?.email) continue

        const { subject, html } = emailMemberEventReminder(
          member.name,
          evt.title,
          formatDate(evt.event_date),
          formatTime(evt.start_time),
          formatTime(evt.end_time),
          evt.location,
          s.time_slot ?? null,
          daysOut,
        )

        const result = await sendEmail({
          to: member.email,
          cc: member.parent_email || undefined,
          subject,
          html,
        })

        await admin.from('jjwl_notifications_log').insert({
          trigger: `event_reminder_${daysOut}d`,
          recipient: member.email,
          event_id: evt.id,
          success: result.success,
          error: result.error ?? null,
        })

        if (result.success) totalSent++
      }
    }
  }

  return NextResponse.json({ sent: totalSent })
}
