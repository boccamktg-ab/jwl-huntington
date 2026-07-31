import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireGrantsReviewerFromRequest } from '@/lib/admin'
import { sendEmail, getGrantsReviewerEmails, emailAdminNewGrant } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST — admin-entered grant (quick-add or scan-first)
export async function POST(request: NextRequest) {
  const actor = await requireGrantsReviewerFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { intake_type, grant_type, admin_referrer_name, admin_referrer_org,
          admin_referrer_phone, admin_referrer_email, admin_notes,
          beneficiary_name, contact_info, requested_amount } = body

  if (!['quick_add', 'scan_first'].includes(intake_type)) {
    return NextResponse.json({ error: 'Invalid intake_type' }, { status: 400 })
  }
  if (!['charitable_children', 'lift_fund'].includes(grant_type)) {
    return NextResponse.json({ error: 'Invalid grant_type' }, { status: 400 })
  }

  const supabase = db()

  const status = intake_type === 'scan_first' ? 'pending_transcription' : 'incomplete'
  const source = intake_type === 'scan_first' ? 'admin_scan' : 'admin_quick_add'

  const { data: app, error: appError } = await supabase
    .from('grant_applications')
    .insert({
      grant_type,
      status,
      source,
      requested_amount: requested_amount ?? 0,
      admin_referrer_name: admin_referrer_name ?? null,
      admin_referrer_org: admin_referrer_org ?? null,
      admin_referrer_phone: admin_referrer_phone ?? null,
      admin_referrer_email: admin_referrer_email ?? null,
      admin_notes: admin_notes ?? null,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (appError || !app) {
    console.error(appError)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }

  // Insert minimal details for quick-add
  if (intake_type === 'quick_add') {
    await supabase.from('grant_application_details').insert({
      application_id: app.id,
      beneficiary_name: beneficiary_name ?? null,
      justification: contact_info ?? null,
    })
  }

  return NextResponse.json({ id: app.id })
}
