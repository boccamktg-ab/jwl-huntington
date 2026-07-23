import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, getJjwlAdminEmails, emailAdminRoster } from '@/lib/email'

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
  const adminEmails = await getJjwlAdminEmails()
  if (adminEmails.length === 0) return NextResponse.json({ sent: 0 })

  let totalSent = 0

  // Send roster 7 days before and 1 day before
  for (const daysOut of [7, 1]) {
    const targetDate = dateInNDays(daysOut)

    const { data: events } = await admin
      .from('jjwl_events')
      .select('id, title, location, event_date, start_time, end_time')
      .eq('status', 'active')
      .eq('event_date', targetDate)

    for (const evt of events ?? []) {
      const { data: signups } = await admin
        .from('jjwl_signups')
        .select('time_slot, jjwl_members(name, email, phone)')
        .eq('event_id', evt.id)
        .in('status', ['signed_up', 'admin_added'])

      const members = (signups ?? []).map((s: any) => {
        const m = Array.isArray(s.jjwl_members) ? s.jjwl_members[0] : s.jjwl_members
        return {
          name: m?.name ?? '—',
          email: m?.email ?? '—',
          phone: m?.phone ?? '—',
          timeSlot: s.time_slot ?? null,
        }
      })

      const { subject, html } = emailAdminRoster(
        evt.title,
        formatDate(evt.event_date),
        formatTime(evt.start_time),
        formatTime(evt.end_time),
        evt.location,
        members,
        daysOut,
      )

      const result = await sendEmail({ to: adminEmails, subject, html })
      if (result.success) totalSent++
    }
  }

  return NextResponse.json({ sent: totalSent })
}
