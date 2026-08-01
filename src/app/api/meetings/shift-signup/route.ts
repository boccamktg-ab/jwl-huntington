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

async function getMemberId(userId: string) {
  const { data } = await db()
    .from('jwl_members')
    .select('id')
    .eq('auth_id', userId)
    .eq('status', 'approved')
    .single()
  return data?.id ?? null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = await getMemberId(user.id)
  if (!memberId) return NextResponse.json({ error: 'Member not found' }, { status: 403 })

  const { shift_id } = await request.json()
  if (!shift_id) return NextResponse.json({ error: 'Missing shift_id' }, { status: 400 })

  const { error } = await db()
    .from('jwl_meeting_shift_signups')
    .upsert({ shift_id, member_id: memberId }, { onConflict: 'shift_id,member_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = await getMemberId(user.id)
  if (!memberId) return NextResponse.json({ error: 'Member not found' }, { status: 403 })

  const { shift_id } = await request.json()
  if (!shift_id) return NextResponse.json({ error: 'Missing shift_id' }, { status: 400 })

  const { error } = await db()
    .from('jwl_meeting_shift_signups')
    .delete()
    .eq('shift_id', shift_id)
    .eq('member_id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
