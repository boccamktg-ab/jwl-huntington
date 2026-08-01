import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireGrantsReviewerFromRequest } from '@/lib/admin'
import { sendEmail, emailGrantsPortalInvite } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH — update referrer contact info and/or assigned SW
export async function PATCH(request: NextRequest) {
  const actor = await requireGrantsReviewerFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const {
    application_id,
    admin_referrer_name,
    admin_referrer_org,
    admin_referrer_phone,
    admin_referrer_email,
    admin_notes,
    assigned_sw_id,
  } = await request.json()

  if (!application_id) return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })

  const supabase = db()
  const { error } = await supabase
    .from('grant_applications')
    .update({
      admin_referrer_name: admin_referrer_name ?? null,
      admin_referrer_org: admin_referrer_org ?? null,
      admin_referrer_phone: admin_referrer_phone ?? null,
      admin_referrer_email: admin_referrer_email ?? null,
      admin_notes: admin_notes ?? null,
      assigned_sw_id: assigned_sw_id || null,
    })
    .eq('id', application_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST — send portal invite to referrer contact
export async function POST(request: NextRequest) {
  const actor = await requireGrantsReviewerFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { application_id } = await request.json()
  if (!application_id) return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })

  const supabase = db()
  const { data: app } = await supabase
    .from('grant_applications')
    .select('admin_referrer_name, admin_referrer_email')
    .eq('id', application_id)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (!app.admin_referrer_email) return NextResponse.json({ error: 'No referrer email on file' }, { status: 400 })

  // Get the actor's name to personalise the invite
  const { data: member } = await supabase
    .from('jwl_members')
    .select('name')
    .eq('auth_id', actor.id)
    .maybeSingle()
  const invitedByName = member?.name ?? 'JWL Huntington'

  const { subject, html } = emailGrantsPortalInvite(
    app.admin_referrer_name ?? 'there',
    invitedByName,
    application_id,
  )

  const { success, error } = await sendEmail({ to: app.admin_referrer_email, subject, html })
  if (!success) return NextResponse.json({ error: error ?? 'Failed to send invite' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
