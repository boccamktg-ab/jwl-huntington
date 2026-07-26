import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { sendEmail, emailEventPublished, emailEventCancelledToSignup } from '@/lib/email'

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

  const admin = db()
  const { data: member } = await admin
    .from('jwl_members')
    .select('is_admin, is_jjwl_admin, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (member?.is_admin || (member?.is_jjwl_admin && member?.status === 'approved')) return user
  return null
}

export async function POST(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { title, location, event_date, start_time, end_time, volunteer_slots_total, time_slots, credit_hours, description } =
    await request.json()

  if (!title || !location || !event_date || !start_time) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const { data, error } = await db().from('jjwl_events').insert({
    title, location, event_date, start_time,
    end_time: end_time || null,
    volunteer_slots_total: volunteer_slots_total ?? 0,
    time_slots: time_slots ?? null,
    credit_hours: credit_hours ?? 1,
    description: description || null,
    status: 'draft',
    created_by: user.id,
    updated_by: user.id,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function PATCH(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { event_id, title, location, event_date, start_time, end_time, volunteer_slots_total, time_slots, credit_hours, description, status } = body

  if (!event_id) return NextResponse.json({ error: 'Missing event_id.' }, { status: 400 })

  // Status-only update (publish / unpublish)
  if (status && !title) {
    const admin = db()

    // Fetch current event + previous status for notification logic
    const { data: evt } = await admin
      .from('jjwl_events')
      .select('title, event_date, start_time, end_time, location, credit_hours, description, volunteer_slots_total, status')
      .eq('id', event_id)
      .maybeSingle()

    const { error } = await admin.from('jjwl_events').update({ status, updated_at: new Date().toISOString() }).eq('id', event_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (evt) {
      const prevStatus = evt.status
      const dateLabel = new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

      if (status === 'active' && prevStatus !== 'active') {
        // Notify all active members
        const { data: members } = await admin
          .from('jjwl_members')
          .select('name, email, parent_email')
          .eq('status', 'active')

        for (const m of members ?? []) {
          const { subject, html } = emailEventPublished(
            m.name, evt.title, dateLabel,
            evt.start_time?.slice(0, 5) ?? null,
            evt.end_time?.slice(0, 5) ?? null,
            evt.location, Number(evt.credit_hours),
            evt.description ?? null, evt.volunteer_slots_total,
          )
          await sendEmail({ to: m.email, subject, html })
          if (m.parent_email) await sendEmail({ to: m.parent_email, subject, html })
        }
      }

      if (status === 'draft' && prevStatus === 'active') {
        // Notify members who are signed up for this event
        const { data: signups } = await admin
          .from('jjwl_signups')
          .select('jjwl_members(name, email, parent_email)')
          .eq('event_id', event_id)
          .in('status', ['signed_up', 'admin_added'])

        for (const s of signups ?? []) {
          const m = Array.isArray(s.jjwl_members) ? s.jjwl_members[0] : s.jjwl_members
          if (!m?.email) continue
          const { subject, html } = emailEventCancelledToSignup(m.name, evt.title, dateLabel)
          await sendEmail({ to: m.email, subject, html })
          if (m.parent_email) await sendEmail({ to: m.parent_email, subject, html })
        }
      }
    }

    return NextResponse.json({ ok: true })
  }

  const admin = db()

  // Check if capacity dropped below current signup count
  if (volunteer_slots_total > 0) {
    const { count } = await admin
      .from('jjwl_signups')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event_id)
      .in('status', ['signed_up', 'confirmed_attended'])

    if ((count ?? 0) > volunteer_slots_total) {
      return NextResponse.json({
        error: `Warning: ${count} people are already signed up, but new capacity is ${volunteer_slots_total}. Please review the signup list before reducing capacity.`
      }, { status: 409 })
    }
  }

  const { error } = await admin.from('jjwl_events').update({
    title, location, event_date, start_time,
    end_time: end_time || null,
    volunteer_slots_total: volunteer_slots_total ?? 0,
    time_slots: time_slots ?? null,
    credit_hours: credit_hours ?? 1,
    description: description || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq('id', event_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isSuperAdmin = isSuperAdminEmail(user.email)
  const admin = db()

  if (!isSuperAdmin) {
    const { data: member } = await admin
      .from('jwl_members')
      .select('is_admin, is_super_admin, is_jjwl_admin, status')
      .eq('auth_id', user.id)
      .maybeSingle()
    if (!member?.is_admin && !member?.is_super_admin && !member?.is_jjwl_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  const { eventId } = await request.json()
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  const { error } = await admin.from('jjwl_events').delete().eq('id', eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
