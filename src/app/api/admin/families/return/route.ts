import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailSWFamilyReturned } from '@/lib/email'

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

  const { family_id, note } = await request.json()
  if (!family_id) return NextResponse.json({ error: 'Missing family_id' }, { status: 400 })

  const admin = db()

  const { data: family } = await admin
    .from('families')
    .select('id, family_number, status, social_worker_id, social_workers(name, email)')
    .eq('id', family_id)
    .maybeSingle()

  if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })
  if (family.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved families can be returned' }, { status: 400 })
  }

  const { error } = await admin
    .from('families')
    .update({ status: 'submitted' })
    .eq('id', family_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sw = Array.isArray(family.social_workers) ? family.social_workers[0] : family.social_workers
  if (sw?.email) {
    const { subject, html } = emailSWFamilyReturned(sw.name, family.family_number, note ?? undefined)
    await sendEmail({ to: sw.email, subject, html })
  }

  return NextResponse.json({ ok: true })
}
