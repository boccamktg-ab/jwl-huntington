import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, getPortalAdminEmails, emailAdminNewSocialWorker, emailSWRegistrationReceived, createApprovalToken } from '@/lib/email'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { name, email, password, schoolIds, swType, organization, orgType } = await request.json()
  const isCommunity = swType === 'community'

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }
  if (!isCommunity && !schoolIds?.length) {
    return NextResponse.json({ error: 'Please select at least one school.' }, { status: 400 })
  }
  if (isCommunity && !organization?.trim()) {
    return NextResponse.json({ error: 'Organization name is required.' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { data: sw, error: swError } = await supabase
    .from('social_workers')
    .insert({
      name, email, auth_id: authData.user.id, status: 'pending',
      sw_type: isCommunity ? 'community' : 'school',
      organization: isCommunity ? `${organization.trim()}${orgType ? ` (${orgType})` : ''}` : null,
    })
    .select('id')
    .single()

  if (swError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: swError.message }, { status: 500 })
  }

  // Link schools (school-affiliated only)
  if (!isCommunity && schoolIds?.length) {
    const schoolLinks = schoolIds.map((school_id: string) => ({
      social_worker_id: sw.id,
      school_id,
    }))
    await supabase.from('social_worker_schools').insert(schoolLinks)
  }

  // Confirm receipt to social worker
  const { subject: swSubject, html: swHtml } = emailSWRegistrationReceived(name)
  await sendEmail({ to: email, subject: swSubject, html: swHtml })

  // Notify admins — label shows schools or organization
  let affiliationLabel: string
  if (isCommunity) {
    affiliationLabel = organization.trim() + (orgType ? ` (${orgType})` : '')
  } else {
    const { data: schoolRows } = await supabase.from('schools').select('name').in('id', schoolIds)
    affiliationLabel = (schoolRows ?? []).map((s: any) => s.name).join(', ') || 'Unknown'
  }
  const adminEmails = await getPortalAdminEmails()
  if (adminEmails.length > 0) {
    const approvalUrl = await createApprovalToken('social_worker', sw.id)
    const { subject, html } = emailAdminNewSocialWorker(name, email, affiliationLabel, approvalUrl ?? undefined)
    await sendEmail({ to: adminEmails, subject, html })
  }

  return NextResponse.json({ ok: true })
}
