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

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { member_id, phone, parent_name, parent_phone, parent_email } = await request.json()
  if (!member_id) return NextResponse.json({ error: 'Missing member_id.' }, { status: 400 })

  const admin = db()

  // Verify this member belongs to the calling user
  const { data: member } = await admin
    .from('jjwl_members')
    .select('id')
    .eq('id', member_id)
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await admin
    .from('jjwl_members')
    .update({
      phone: phone ?? null,
      parent_name: parent_name || null,
      parent_phone: parent_phone || null,
      parent_email: parent_email || null,
    })
    .eq('id', member_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
