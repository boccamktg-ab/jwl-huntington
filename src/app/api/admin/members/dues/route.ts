import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH — update position, dues, join_year, or phone for a member
export async function PATCH(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { member_id, dues_paid_through_year, join_year, position_id, position_detail, phone } = await request.json()
  if (!member_id) return NextResponse.json({ error: 'Missing member_id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (dues_paid_through_year !== undefined) update.dues_paid_through_year = dues_paid_through_year
  if (join_year !== undefined) update.join_year = join_year
  if (position_id !== undefined) update.position_id = position_id
  if (position_detail !== undefined) update.position_detail = position_detail
  if (phone !== undefined) update.phone = phone

  const { error } = await db().from('jwl_members').update(update).eq('id', member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
