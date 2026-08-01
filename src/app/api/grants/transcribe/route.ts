import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireGrantsReviewerFromRequest } from '@/lib/admin'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const actor = await requireGrantsReviewerFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { application_id, requested_amount, details, household_members, submit } = await request.json()
  if (!application_id) return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })

  const supabase = db()

  // Verify application is in a transcribable state
  const { data: app } = await supabase
    .from('grant_applications')
    .select('id, status, grant_type')
    .eq('id', application_id)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (!['pending_transcription', 'incomplete'].includes(app.status)) {
    return NextResponse.json({ error: 'Application is not pending transcription' }, { status: 400 })
  }

  // Upsert details
  const { error: detailError } = await supabase
    .from('grant_application_details')
    .upsert({ application_id, ...details }, { onConflict: 'application_id' })

  if (detailError) {
    console.error(detailError)
    return NextResponse.json({ error: 'Failed to save details' }, { status: 500 })
  }

  // Replace household members if lift fund
  if (app.grant_type === 'lift_fund' && Array.isArray(household_members)) {
    await supabase.from('grant_household_members').delete().eq('application_id', application_id)
    const rows = household_members.filter((m: any) => m.full_name?.trim())
    if (rows.length > 0) {
      await supabase.from('grant_household_members').insert(
        rows.map((m: any, i: number) => ({ application_id, ...m, sort_order: i }))
      )
    }
  }

  // Update application amount and optionally status
  const { error: appError } = await supabase
    .from('grant_applications')
    .update({
      requested_amount: requested_amount ?? 0,
      ...(submit ? { status: 'submitted' } : {}),
    })
    .eq('id', application_id)

  if (appError) {
    console.error(appError)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
