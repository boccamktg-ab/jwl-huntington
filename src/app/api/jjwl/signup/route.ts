import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
    .select('id, name, status')
    .eq('id', member_id)
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (action === 'cancel') {
    const { error } = await admin
      .from('jjwl_signups')
      .update({ status: 'cancelled' })
      .eq('event_id', event_id)
      .eq('member_id', member_id)
      .eq('status', 'signed_up')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify admin of cancellation
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (adminEmail) {
      const { data: evt } = await admin.from('jjwl_events').select('title').eq('id', event_id).single()
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/jjwl/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'cancellation', member_name: member.name, event_title: evt?.title }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'signup') {
    // Check event is still active and not full
    const { data: evt } = await admin
      .from('jjwl_events')
      .select('id, volunteer_slots_total, status')
      .eq('id', event_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!evt) return NextResponse.json({ error: 'Event not found or no longer active.' }, { status: 400 })

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

    // Upsert (re-signup after cancel)
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
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
