import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as serverClient } from '@/lib/supabase/server'
import { isSuperAdminEmail } from '@/lib/admin'
import {
  sendEmail,
  emailBackpackConfirmed,
  emailBackpackWaitlisted,
  emailBackpackCertificate,
} from '@/lib/email'

const MAX_CONFIRMED = 15

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireAdmin() {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSuperAdminEmail(user.email)) return user
  const { data: member } = await db()
    .from('jwl_members')
    .select('is_admin')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (member?.is_admin) return user
  return null
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, action } = await request.json()
  if (!id || !action) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const admin = db()

  const { data: signup } = await admin
    .from('backpack_signups')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!signup) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  if (action === 'confirm') {
    // Check cap
    const { count } = await admin
      .from('backpack_signups')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')

    if ((count ?? 0) >= MAX_CONFIRMED) {
      return NextResponse.json({ error: `Already at capacity (${MAX_CONFIRMED} confirmed). Use waitlist instead.` }, { status: 409 })
    }

    await admin.from('backpack_signups').update({ status: 'confirmed' }).eq('id', id)
    const { subject, html } = emailBackpackConfirmed(signup.name)
    await sendEmail({ to: signup.email, subject, html })
    return NextResponse.json({ ok: true })
  }

  if (action === 'waitlist') {
    await admin.from('backpack_signups').update({ status: 'waitlisted' }).eq('id', id)
    const { subject, html } = emailBackpackWaitlisted(signup.name)
    await sendEmail({ to: signup.email, subject, html })
    return NextResponse.json({ ok: true })
  }

  if (action === 'certificate') {
    await admin.from('backpack_signups').update({ certificate_sent: true }).eq('id', id)
    const { subject, html } = emailBackpackCertificate(signup.name)
    await sendEmail({ to: signup.email, subject, html })
    return NextResponse.json({ ok: true })
  }

  if (action === 'certificate_all') {
    const { data: confirmed } = await admin
      .from('backpack_signups')
      .select('*')
      .eq('status', 'confirmed')
      .eq('certificate_sent', false)

    for (const s of confirmed ?? []) {
      const { subject, html } = emailBackpackCertificate(s.name)
      await sendEmail({ to: s.email, subject, html })
      await admin.from('backpack_signups').update({ certificate_sent: true }).eq('id', s.id)
    }
    return NextResponse.json({ ok: true, sent: (confirmed ?? []).length })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}

// CSV export
export async function GET(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = db()
  const { data } = await admin
    .from('backpack_signups')
    .select('name, email, mobile, status, certificate_sent, created_at')
    .order('created_at', { ascending: true })

  const header = 'Name,Email,Mobile,Status,Certificate Sent,Registered At'
  const rows = (data ?? []).map(r =>
    [r.name, r.email, r.mobile, r.status, r.certificate_sent ? 'Yes' : 'No',
      new Date(r.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' })]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="backpack-signups.csv"',
    },
  })
}
