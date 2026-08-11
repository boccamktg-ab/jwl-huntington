import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailBackpackAdminAlert, emailBackpackPending } from '@/lib/email'
import { generateActionUrl } from '../action/route'

const ADMIN_EMAIL = 'info@jwlhuntington.org'
const BASE = 'https://portal.jwlhuntington.org'
const MAX_CONFIRMED = 15

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { name, email, mobile } = await request.json()

  if (!name?.trim() || !email?.trim() || !mobile?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const admin = db()

  // Check for duplicate
  const { data: existing } = await admin
    .from('backpack_signups')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 })
  }

  const { error } = await admin.from('backpack_signups').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    mobile: mobile.trim(),
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get the new row's ID for action URLs
  const { data: newRow } = await admin
    .from('backpack_signups')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  const confirmUrl = newRow ? generateActionUrl(BASE, newRow.id, 'confirm') : `${BASE}/admin/backpacks`
  const waitlistUrl = newRow ? generateActionUrl(BASE, newRow.id, 'waitlist') : `${BASE}/admin/backpacks`

  // Alert admin with one-click action buttons
  const alert = emailBackpackAdminAlert(name.trim(), email.trim(), mobile.trim(), confirmUrl, waitlistUrl)
  await sendEmail({ to: ADMIN_EMAIL, subject: alert.subject, html: alert.html })

  // Pending confirmation to registrant
  const pending = emailBackpackPending(name.trim())
  await sendEmail({ to: email.trim(), subject: pending.subject, html: pending.html })

  return NextResponse.json({ ok: true })
}
