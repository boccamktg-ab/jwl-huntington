import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendEmail,
  getJjwlAdminEmails,
  emailRegistrationSubmitted,
  emailRegistrationWaitlisted,
  emailAdminNewRegistration,
} from '@/lib/email'

const MEMBER_CAP = 76

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { name, email, password, grade, phone, school_id, parent_name, parent_phone, parent_email } =
    await request.json()

  if (!name || !email || !password || !grade || !phone || !school_id) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const admin = db()

  // Look up school name for admin email
  const { data: school } = await admin
    .from('schools')
    .select('name')
    .eq('id', school_id)
    .maybeSingle()

  // Check cap (count all non-inactive, non-waitlisted members)
  const { count: activeCount } = await admin
    .from('jjwl_members')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("inactive","waitlisted")')

  const isWaitlisted = (activeCount ?? 0) >= MEMBER_CAP

  // Create Supabase Auth account
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insert jjwl_members row
  const { error: insertError } = await admin.from('jjwl_members').insert({
    auth_id: authData.user.id,
    name,
    email,
    grade,
    phone,
    school_id: school_id || null,
    parent_name: parent_name || null,
    parent_phone: parent_phone || null,
    parent_email: parent_email || null,
    status: isWaitlisted ? 'waitlisted' : 'pending_approval',
  })

  if (insertError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Confirm to applicant (CC parent if provided)
  const emailFn = isWaitlisted ? emailRegistrationWaitlisted(name) : emailRegistrationSubmitted(name)
  await sendEmail({
    to: email,
    cc: parent_email || undefined,
    subject: emailFn.subject,
    html: emailFn.html,
  })

  // Notify all JJWL admins
  const adminEmails = await getJjwlAdminEmails()
  if (adminEmails.length > 0) {
    const { subject: aSubject, html: aHtml } = emailAdminNewRegistration(
      name,
      email,
      grade,
      school?.name ?? 'Unknown',
    )
    await sendEmail({ to: adminEmails, subject: aSubject, html: aHtml })
  }

  await admin.from('jjwl_notifications_log').insert({
    trigger: 'registration_submitted',
    recipient: email,
    success: true,
  })

  return NextResponse.json({ ok: true })
}
