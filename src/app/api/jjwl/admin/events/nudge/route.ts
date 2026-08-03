import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { isSuperAdminEmail } from '@/lib/admin'
import { sendEmail, emailEventPublished } from '@/lib/email'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireJJWLAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSuperAdminEmail(user.email)) return user
  const admin = db()
  const { data: member } = await admin
    .from('jwl_members')
    .select('is_admin, is_jjwl_admin, status')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (member?.is_admin || (member?.is_jjwl_admin && member?.status === 'approved')) return user
  return null
}

export async function POST(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { event_id } = await request.json()
  if (!event_id) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })

  const admin = db()

  const { data: evt } = await admin
    .from('jjwl_events')
    .select('title, event_date, start_time, end_time, location, credit_hours, description, volunteer_slots_total, status')
    .eq('id', event_id)
    .single()

  if (!evt || evt.status !== 'active') {
    return NextResponse.json({ error: 'Event not found or not active' }, { status: 404 })
  }

  // Members who have already signed up (any non-cancelled status)
  const { data: signups } = await admin
    .from('jjwl_signups')
    .select('member_id')
    .eq('event_id', event_id)
    .neq('status', 'cancelled')

  const signedUpIds = new Set((signups ?? []).map((s: any) => s.member_id))

  // All active members not yet signed up
  const { data: members } = await admin
    .from('jjwl_members')
    .select('id, name, email, parent_email')
    .eq('status', 'active')

  const dateLabel = new Date(evt.event_date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })

  let sent = 0
  for (const m of members ?? []) {
    if (signedUpIds.has(m.id)) continue
    const { subject, html } = emailEventPublished(
      m.name, evt.title, dateLabel,
      evt.start_time?.slice(0, 5) ?? null,
      evt.end_time?.slice(0, 5) ?? null,
      evt.location, Number(evt.credit_hours),
      evt.description ?? null, evt.volunteer_slots_total,
    )
    await sendEmail({ to: m.email, subject, html })
    if (m.parent_email) await sendEmail({ to: m.parent_email, subject, html })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
