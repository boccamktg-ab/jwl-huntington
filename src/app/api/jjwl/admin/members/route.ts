import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailRegistrationApproved, emailRegistrationRejected, emailDuesPaid } from '@/lib/email'

const MEMBER_CAP = 76

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

  if (isSuperAdminEmail(user.email)) return user

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

  const body = await request.json()
  const { member_id, action } = body
  if (!member_id || !action) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const admin = db()

  const { data: member } = await admin
    .from('jjwl_members')
    .select('name, email, parent_email, status, auth_id')
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

    const { subject, html } = emailDuesPaid(member.name)
    await sendEmail({ to: member.email, subject, html })
    if (member.parent_email) await sendEmail({ to: member.parent_email, subject, html })

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

  if (action === 'approve_waitlist') {
    // Re-check cap before approving off waitlist
    const { count: activeCount } = await admin
      .from('jjwl_members')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("inactive","waitlisted")')

    if ((activeCount ?? 0) >= MEMBER_CAP) {
      return NextResponse.json({ error: `Still at capacity (${MEMBER_CAP} members). Deactivate or remove a member first.` }, { status: 409 })
    }

    await admin.from('jjwl_members').update({
      status: 'approved_unpaid',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    }).eq('id', member_id)

    const { data: setting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'jjwl_cheddarup_url')
      .maybeSingle()
    const cheddarUpUrl = setting?.value ?? ''

    const { subject, html } = emailRegistrationApproved(member.name, cheddarUpUrl)
    await sendEmail({ to: member.email, subject, html })
    if (member.parent_email) await sendEmail({ to: member.parent_email, subject, html })

    await admin.from('jjwl_notifications_log').insert({
      trigger: 'registration_approved', recipient: member.email, member_id, success: true,
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'reject') {
    await admin.from('jjwl_members').update({ status: 'inactive' }).eq('id', member_id)

    const { subject, html } = emailRegistrationRejected(member.name)
    await sendEmail({ to: member.email, subject, html })
    if (member.parent_email) await sendEmail({ to: member.parent_email, subject, html })

    return NextResponse.json({ ok: true })
  }

  if (action === 'update_info') {
    const { name, phone, grade, school_id, parent_name, parent_phone, parent_email, notes } = body
    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (grade !== undefined) updates.grade = grade
    if (school_id !== undefined) updates.school_id = school_id || null
    if (parent_name !== undefined) updates.parent_name = parent_name
    if (parent_phone !== undefined) updates.parent_phone = parent_phone
    if (parent_email !== undefined) updates.parent_email = parent_email
    if (notes !== undefined) updates.notes = notes
    const { error } = await admin.from('jjwl_members').update(updates).eq('id', member_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    const authId = member.auth_id ?? null

    // Snapshot member name into signup rows and cancel any active/upcoming signups
    // so event rosters remain legible after the member row is deleted.
    await admin
      .from('jjwl_signups')
      .update({ member_name: member.name })
      .eq('member_id', member_id)

    // Cancel any pending signups so event rosters show cancelled rather than
    // silently losing the row when the FK is nulled out on delete.
    await admin
      .from('jjwl_signups')
      .update({ status: 'cancelled' })
      .eq('member_id', member_id)
      .in('status', ['signed_up', 'admin_added'])

    const { error } = await admin.from('jjwl_members').delete().eq('id', member_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (authId) await admin.auth.admin.deleteUser(authId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
