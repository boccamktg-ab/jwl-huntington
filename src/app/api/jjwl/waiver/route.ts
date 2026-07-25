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

  const { data: member } = await db()
    .from('jjwl_members')
    .select('id, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member || member.status !== 'approved') {
    return NextResponse.json({ error: 'Member not found or not approved' }, { status: 403 })
  }

  const body = await request.json()
  const { season, parent_name, address, city, zip, medical_conditions, medications,
          emergency_contact, emergency_phone, emergency_cell, photo_consent, signature } = body

  if (!season || !parent_name || !address || !city || !zip || !emergency_contact || !signature) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await db().from('jjwl_waivers').upsert({
    member_id: member.id,
    season,
    parent_name,
    address,
    city,
    zip,
    medical_conditions: medical_conditions ?? null,
    medications: medications ?? null,
    emergency_contact,
    emergency_phone: emergency_phone || null,
    emergency_cell: emergency_cell || null,
    photo_consent: photo_consent ?? true,
    signature,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'member_id,season' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
