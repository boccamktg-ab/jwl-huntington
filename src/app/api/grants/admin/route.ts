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

// POST — admin-entered grant (quick-add, scan-first, or full form)
export async function POST(request: NextRequest) {
  const actor = await requireGrantsReviewerFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { intake_type, grant_type, admin_referrer_name, admin_referrer_org,
          admin_referrer_phone, admin_referrer_email, admin_notes,
          beneficiary_name, contact_info, requested_amount,
          assigned_sw_id, details, household_members } = body

  if (!['quick_add', 'scan_first', 'full_form'].includes(intake_type)) {
    return NextResponse.json({ error: 'Invalid intake_type' }, { status: 400 })
  }
  if (!['charitable_children', 'lift_fund'].includes(grant_type)) {
    return NextResponse.json({ error: 'Invalid grant_type' }, { status: 400 })
  }

  const supabase = db()

  const status = intake_type === 'scan_first' ? 'pending_transcription'
    : intake_type === 'quick_add' ? 'incomplete'
    : 'submitted'
  const source = intake_type === 'scan_first' ? 'admin_scan'
    : intake_type === 'quick_add' ? 'admin_quick_add'
    : 'admin_entered'

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
      assigned_sw_id: assigned_sw_id ?? null,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (appError || !app) {
    console.error(appError)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }

  if (intake_type === 'full_form' && details) {
    const { error: detailError } = await supabase
      .from('grant_application_details')
      .insert({ application_id: app.id, ...details })
    if (detailError) {
      console.error(detailError)
      await supabase.from('grant_applications').delete().eq('id', app.id)
      return NextResponse.json({ error: 'Failed to save application details' }, { status: 500 })
    }

    if (grant_type === 'lift_fund' && Array.isArray(household_members) && household_members.length > 0) {
      const rows = household_members
        .filter((m: any) => m.full_name?.trim())
        .map((m: any, i: number) => ({
          application_id: app.id,
          full_name: m.full_name.trim(),
          age: m.age || null,
          married: m.married ?? false,
          sort_order: i,
        }))
      if (rows.length > 0) await supabase.from('grant_household_members').insert(rows)
    }
  } else if (intake_type === 'quick_add') {
    await supabase.from('grant_application_details').insert({
      application_id: app.id,
      beneficiary_name: beneficiary_name ?? null,
      justification: contact_info ?? null,
    })
  }

  return NextResponse.json({ id: app.id })
}

// PATCH — assign or reassign a social worker to an admin-entered application
export async function PATCH(request: NextRequest) {
  const actor = await requireGrantsReviewerFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { application_id, assigned_sw_id } = await request.json()
  if (!application_id) return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })

  const supabase = db()
  const { error } = await supabase
    .from('grant_applications')
    .update({ assigned_sw_id: assigned_sw_id ?? null })
    .eq('id', application_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
