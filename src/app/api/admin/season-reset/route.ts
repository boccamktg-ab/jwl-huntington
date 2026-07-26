import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailSWSeasonReset, emailAdminSeasonReset, getPortalAdminEmails } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST — reset season: clear all assignments, return all approved families to draft
export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = db()

  // Delete all assignments (assignment_children cascade)
  const { error: assignErr } = await admin.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 })

  // Reset all approved families back to draft so SWs can edit/re-submit
  const { error: familyErr } = await admin
    .from('families')
    .update({ status: 'draft' })
    .eq('status', 'approved')
  if (familyErr) return NextResponse.json({ error: familyErr.message }, { status: 500 })

  // Also reset submitted families back to draft
  const { error: submittedErr } = await admin
    .from('families')
    .update({ status: 'draft' })
    .eq('status', 'submitted')
  if (submittedErr) return NextResponse.json({ error: submittedErr.message }, { status: 500 })

  // Clear children_requested on all JWL members
  const { error: memberErr } = await admin
    .from('jwl_members')
    .update({ children_requested: null })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  // Notify all approved social workers
  const { data: workers } = await admin
    .from('social_workers')
    .select('name, email')
    .eq('status', 'approved')

  let notified = 0
  for (const sw of workers ?? []) {
    if (!sw.email) continue
    const { subject, html } = emailSWSeasonReset(sw.name)
    await sendEmail({ to: sw.email, subject, html })
    notified++
  }

  // Notify portal admins
  const adminEmails = await getPortalAdminEmails()
  if (adminEmails.length > 0) {
    const { subject, html } = emailAdminSeasonReset(notified)
    await sendEmail({ to: adminEmails, subject, html })
  }

  return NextResponse.json({ ok: true, notified })
}
