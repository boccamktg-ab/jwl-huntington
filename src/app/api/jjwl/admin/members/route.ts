import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailRegistrationApproved } from '@/lib/email'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireJJWLAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) return user

  const { data: member } = await db()
    .from('jwl_members')
    .select('is_admin, is_jjwl_admin, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (member?.is_admin || (member?.is_jjwl_admin && member?.status === 'approved')) return user
  return null
}

export async function PATCH(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { member_id, action } = await request.json()
  if (!member_id || !action) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const admin = db()

  const { data: member } = await admin
    .from('jjwl_members')
    .select('name, email, parent_email, status')
    .eq('id', member_id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })

  if (action === 'approve') {
    await admin.from('jjwl_members').update({
      status: 'approved_unpaid',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    }).eq('id', member_id)

    // Get CheddarUp link
    const { data: setting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'jjwl_cheddarup_url')
      .maybeSingle()
    const cheddarUpUrl = setting?.value ?? ''

    const { subject, html } = emailRegistrationApproved(member.name, cheddarUpUrl)
    await sendEmail({ to: member.email, subject, html })
    if (member.parent_email) {
      await sendEmail({ to: member.parent_email, subject, html })
    }

    await admin.from('jjwl_notifications_log').insert({
      trigger: 'registration_approved', recipient: member.email, member_id, success: true,
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'mark_paid') {
    await admin.from('jjwl_members').update({
      membership_paid: true,
      status: 'active',
    }).eq('id', member_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'deactivate') {
    await admin.from('jjwl_members').update({ status: 'inactive' }).eq('id', member_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'reactivate') {
    await admin.from('jjwl_members').update({ status: 'active' }).eq('id', member_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'reject') {
    await admin.from('jjwl_members').update({ status: 'inactive' }).eq('id', member_id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
