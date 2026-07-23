import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import {
  sendEmail,
  getJjwlAdminEmails,
  emailEventSignupConfirmation,
  emailAdminEventSignup,
  emailAdminEventCancellation,
} from '@/lib/email'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function formatTime(t: string | null) {
  if (!t) return null
  // HH:MM:SS → HH:MM
  return t.slice(0, 5)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id, member_id, action, time_slot } = await request.json()
  if (!event_id || !member_id || !action) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const admin = db()

  // Verify the member belongs to the calling user
  const { data: member } = await admin
    .from('jjwl_members')
    .select('id, name, email, phone, parent_email, status')
    .eq('id', member_id)
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Fetch event details (needed for emails either way)
  const { data: evt } = await admin
    .from('jjwl_events')
    .select('id, title, location, event_date, start_time, end_time, volunteer_slots_total, status, credit_hours')
    .eq('id', event_id)
    .maybeSingle()

  if (action === 'cancel') {
    const { error } = await admin
      .from('jjwl_signups')
      .update({ status: 'cancelled' })
      .eq('event_id', event_id)
      .eq('member_id', member_id)
      .eq('status', 'signed_up')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify all JJWL admins
    if (evt) {
      const adminEmails = await getJjwlAdminEmails()
      if (adminEmails.length > 0) {
        const { subject, html } = emailAdminEventCancellation(
          member.name,
          member.email,
          evt.title,
          formatDate(evt.event_date),
        )
        await sendEmail({ to: adminEmails, subject, html })
      }
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'signup') {
    if (!evt || evt.status !== 'active') {
      return NextResponse.json({ error: 'Event not found or no longer active.' }, { status: 400 })
    }

    // Check capacity
    if (evt.volunteer_slots_total > 0) {
      const { count } = await admin
        .from('jjwl_signups')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .in('status', ['signed_up', 'confirmed_attended'])

      if ((count ?? 0) >= evt.volunteer_slots_total) {
        return NextResponse.json({ error: 'This event is full.' }, { status: 409 })
      }
    }

    const { error } = await admin
      .from('jjwl_signups')
      .upsert({
        event_id,
        member_id,
        time_slot: time_slot || null,
        status: 'signed_up',
        signed_up_at: new Date().toISOString(),
      }, { onConflict: 'event_id,member_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Confirmation email to member (CC parent)
    const { subject, html } = emailEventSignupConfirmation(
      member.name,
      evt.title,
      formatDate(evt.event_date),
      formatTime(evt.start_time),
      formatTime(evt.end_time),
      evt.location,
      time_slot || null,
      Number(evt.credit_hours),
    )
    await sendEmail({
      to: member.email,
      cc: member.parent_email || undefined,
      subject,
      html,
    })

    // Notify all JJWL admins
    const adminEmails = await getJjwlAdminEmails()
    if (adminEmails.length > 0) {
      const { subject: aSubject, html: aHtml } = emailAdminEventSignup(
        member.name,
        member.email,
        evt.title,
        formatDate(evt.event_date),
        time_slot || null,
      )
      await sendEmail({ to: adminEmails, subject: aSubject, html: aHtml })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
