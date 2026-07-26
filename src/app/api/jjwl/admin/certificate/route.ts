import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { isSuperAdminEmail } from '@/lib/admin'
import { sendEmail, emailYearEndCertificate } from '@/lib/email'

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

// POST — send year-end certificate email to a single member
export async function POST(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { member_id, season } = await request.json()
  if (!member_id || !season) return NextResponse.json({ error: 'Missing member_id or season' }, { status: 400 })

  const admin = db()

  const { data: member } = await admin
    .from('jjwl_members')
    .select('name, email, parent_email')
    .eq('id', member_id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Calculate total hours: confirmed signups + manual adjustments
  const [{ data: signups }, { data: adjustments }] = await Promise.all([
    admin.from('jjwl_signups')
      .select('hours_awarded')
      .eq('member_id', member_id)
      .eq('status', 'confirmed_attended'),
    admin.from('jjwl_hour_adjustments')
      .select('delta')
      .eq('member_id', member_id),
  ])

  const totalHours =
    (signups ?? []).reduce((s, r) => s + Number(r.hours_awarded ?? 0), 0) +
    (adjustments ?? []).reduce((s, r) => s + Number(r.delta), 0)

  const { subject, html } = emailYearEndCertificate(member.name, totalHours, season)
  await sendEmail({ to: member.email, subject, html })
  if (member.parent_email) await sendEmail({ to: member.parent_email, subject, html })

  return NextResponse.json({ ok: true, totalHours })
}
