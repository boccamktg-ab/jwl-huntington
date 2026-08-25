import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailSignupFixNotice } from '@/lib/email'

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
  const { data: member } = await db()
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

  const admin = db()
  const today = new Date().toISOString().slice(0, 10)

  // Find members with a cancelled signup on a future active event
  const { data: cancelled } = await admin
    .from('jjwl_signups')
    .select('member_id, jjwl_members(id, name, email, parent_email), jjwl_events(event_date, status)')
    .eq('status', 'cancelled')
    .gte('jjwl_events.event_date', today)

  // Dedupe by member_id — only email each affected member once
  const seen = new Set<string>()
  const toNotify: { name: string; email: string; parent_email: string | null }[] = []

  for (const row of cancelled ?? []) {
    const m = Array.isArray(row.jjwl_members) ? row.jjwl_members[0] : row.jjwl_members
    const e = Array.isArray(row.jjwl_events) ? row.jjwl_events[0] : row.jjwl_events
    if (!m || !e || e.status !== 'active') continue
    if (seen.has(m.id)) continue
    seen.add(m.id)
    toNotify.push({ name: m.name, email: m.email, parent_email: m.parent_email })
  }

  let sent = 0
  for (const m of toNotify) {
    const { subject, html } = emailSignupFixNotice(m.name)
    await sendEmail({ to: m.email, subject, html })
    if (m.parent_email) await sendEmail({ to: m.parent_email, subject, html })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
