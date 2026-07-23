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

async function requireJJWLAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) return user

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
    created_by: user.id,
    updated_by: user.id,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function PATCH(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { event_id, title, location, event_date, start_time, end_time, volunteer_slots_total, time_slots, credit_hours, description } =
    await request.json()

  if (!event_id) return NextResponse.json({ error: 'Missing event_id.' }, { status: 400 })

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
