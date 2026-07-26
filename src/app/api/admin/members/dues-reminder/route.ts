import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailMemberDuesReminder } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const currentYear = new Date().getFullYear()

  // Find approved members whose dues are overdue
  // Overdue = dues_paid_through_year < currentYear AND
  //           they're not on the new-member grace period (join_year + 1 >= currentYear)
  const { data: members } = await db()
    .from('jwl_members')
    .select('id, name, email, dues_paid_through_year, join_year')
    .eq('status', 'approved')
    .not('email', 'is', null)

  const overdue = (members ?? []).filter(m => {
    const paidThrough = m.dues_paid_through_year ?? 0
    const joinYear = m.join_year ?? 0
    const onGrace = joinYear > 0 && joinYear + 1 >= currentYear
    return !onGrace && paidThrough < currentYear
  })

  let sent = 0
  for (const m of overdue) {
    if (!m.email) continue
    const { subject, html } = emailMemberDuesReminder(m.name, currentYear)
    await sendEmail({ to: m.email, subject, html })
    sent++
  }

  return NextResponse.json({ ok: true, sent, total_overdue: overdue.length })
}

export async function GET(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const currentYear = new Date().getFullYear()

  const { data: members } = await db()
    .from('jwl_members')
    .select('id, name, email, dues_paid_through_year, join_year, status')
    .eq('status', 'approved')

  const overdue = (members ?? []).filter(m => {
    const paidThrough = m.dues_paid_through_year ?? 0
    const joinYear = m.join_year ?? 0
    const onGrace = joinYear > 0 && joinYear + 1 >= currentYear
    return !onGrace && paidThrough < currentYear
  })

  return NextResponse.json({ overdue, current_year: currentYear })
}
