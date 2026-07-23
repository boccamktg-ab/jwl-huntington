import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendEmail,
  emailRegistrationSubmitted,
  emailAdminNewRegistration,
} from '@/lib/email'

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
    status: 'pending_approval',
  })

  if (insertError) {
    // Roll back auth user
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Send confirmation to applicant
  const { subject, html } = emailRegistrationSubmitted(name)
  await sendEmail({ to: email, subject, html })

  // Notify parent if provided
  if (parent_email) {
    await sendEmail({ to: parent_email, subject, html })
  }

  // Notify admin(s)
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (adminEmail) {
    const { subject: aSubject, html: aHtml } = emailAdminNewRegistration(
      name,
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.jwlhuntington.org'}/admin/jjwl/members`
    )
    await sendEmail({ to: adminEmail, subject: aSubject, html: aHtml })
  }

  // Log notification
  await admin.from('jjwl_notifications_log').insert({
    trigger: 'registration_submitted',
    recipient: email,
    success: true,
  })

  return NextResponse.json({ ok: true })
}
