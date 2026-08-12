import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailWaiverNudge } from '@/lib/email'

const SEASON = '2026-2027'

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

  // Active members (paid) who haven't submitted a waiver this season
  const { data: active } = await admin
    .from('jjwl_members')
    .select('id, name, email, parent_email')
    .eq('status', 'active')
    .eq('membership_paid', true)

  if (!active || active.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const { data: waivers } = await admin
    .from('jjwl_waivers')
    .select('member_id')
    .eq('season', SEASON)

  const waiverSet = new Set((waivers ?? []).map(w => w.member_id))
  const needsWaiver = active.filter(m => !waiverSet.has(m.id))

  let sent = 0
  for (const m of needsWaiver) {
    const { subject, html } = emailWaiverNudge(m.name)
    await sendEmail({ to: m.email, subject, html })
    if (m.parent_email) await sendEmail({ to: m.parent_email, subject, html })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
