import { isSuperAdminEmail } from '@/lib/admin'
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

  const isSuperAdmin = isSuperAdminEmail(user.email)
  if (!isSuperAdmin) {
    const { data: member } = await db()
      .from('jwl_members')
      .select('is_admin, is_jjwl_admin, status')
      .eq('auth_id', user.id)
      .maybeSingle()
    if (!member?.is_admin && !(member?.is_jjwl_admin && member?.status === 'approved')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  const { member_id, delta, reason } = await request.json()
  if (!member_id || delta === undefined || !reason?.trim()) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const { error } = await db().from('jjwl_hour_adjustments').insert({
    member_id,
    delta,
    reason: reason.trim(),
    adjusted_by: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
