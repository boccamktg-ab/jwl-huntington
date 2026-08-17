import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailUnpaidEnrollmentWarning } from '@/lib/email'

const DAYS_THRESHOLD = 7

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

export async function GET() {
  // Returns the count so the button can show it
  const admin = db()
  const cutoff = new Date(Date.now() - DAYS_THRESHOLD * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('jjwl_members')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved_unpaid')
    .eq('membership_paid', false)
    .lt('created_at', cutoff)
  return NextResponse.json({ count: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = db()

  const { data: setting } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'jjwl_cheddarup_url')
    .maybeSingle()
  const cheddarUpUrl = setting?.value ?? ''

  const cutoff = new Date(Date.now() - DAYS_THRESHOLD * 24 * 60 * 60 * 1000).toISOString()

  const { data: pending } = await admin
    .from('jjwl_members')
    .select('id, name, email, parent_email')
    .eq('status', 'approved_unpaid')
    .eq('membership_paid', false)
    .lt('created_at', cutoff)

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  for (const m of pending) {
    const { subject, html } = emailUnpaidEnrollmentWarning(m.name, cheddarUpUrl)
    await sendEmail({ to: m.email, subject, html })
    if (m.parent_email) await sendEmail({ to: m.parent_email, subject, html })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
