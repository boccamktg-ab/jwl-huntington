import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailHoursConfirmed } from '@/lib/email'

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

  const { signup_id, event_id, action, credit_hours, member_id } = await request.json()
  if (!action) return NextResponse.json({ error: 'Missing action.' }, { status: 400 })

  const admin = db()

  if (action === 'confirm') {
    const { error } = await admin
      .from('jjwl_signups')
      .update({
        status: 'confirmed_attended',
        hours_awarded: credit_hours ?? 1,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', signup_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send hours-confirmed email
    const { data: signup } = await admin
      .from('jjwl_signups')
      .select('member_id, jjwl_members(name, email), jjwl_events(title)')
      .eq('id', signup_id)
      .single()

    if (signup) {
      const member = Array.isArray(signup.jjwl_members) ? signup.jjwl_members[0] : signup.jjwl_members
      const evt = Array.isArray(signup.jjwl_events) ? signup.jjwl_events[0] : signup.jjwl_events
      if (member?.email && evt?.title) {
        const { subject, html } = emailHoursConfirmed(member.name, evt.title, credit_hours ?? 1)
        await sendEmail({ to: member.email, subject, html })
      }
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'no_show') {
    const { error } = await admin
      .from('jjwl_signups')
      .update({ status: 'no_show', confirmed_by: user.id, confirmed_at: new Date().toISOString() })
      .eq('id', signup_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'admin_add') {
    if (!member_id || !event_id) return NextResponse.json({ error: 'Missing member_id or event_id.' }, { status: 400 })
    const { error } = await admin.from('jjwl_signups').upsert({
      event_id, member_id, status: 'admin_added', signed_up_at: new Date().toISOString(),
    }, { onConflict: 'event_id,member_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'confirm_all') {
    if (!event_id) return NextResponse.json({ error: 'Missing event_id.' }, { status: 400 })

    const { data: pending } = await admin
      .from('jjwl_signups')
      .select('id, jjwl_members(name, email), jjwl_events(title)')
      .eq('event_id', event_id)
      .in('status', ['signed_up', 'admin_added'])

    if (!pending || pending.length === 0) return NextResponse.json({ ok: true, confirmed: 0 })

    const ids = pending.map((s: any) => s.id)
    const { error } = await admin
      .from('jjwl_signups')
      .update({
        status: 'confirmed_attended',
        hours_awarded: credit_hours ?? 1,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const eventTitle = (() => {
      const evt = Array.isArray(pending[0].jjwl_events) ? pending[0].jjwl_events[0] : pending[0].jjwl_events
      return (evt as any)?.title ?? ''
    })()

    for (const s of pending) {
      const m = Array.isArray(s.jjwl_members) ? s.jjwl_members[0] : s.jjwl_members
      if ((m as any)?.email) {
        const { subject, html } = emailHoursConfirmed((m as any).name, eventTitle, credit_hours ?? 1)
        await sendEmail({ to: (m as any).email, subject, html })
      }
    }

    return NextResponse.json({ ok: true, confirmed: pending.length })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
