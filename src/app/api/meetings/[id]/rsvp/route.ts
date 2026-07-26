import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: meeting_id } = await params

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { response } = await request.json()
  if (response !== 'yes' && response !== 'no') {
    return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
  }

  const admin = db()

  const { data: member } = await admin
    .from('jwl_members')
    .select('id')
    .eq('auth_id', user.id)
    .eq('status', 'approved')
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { error } = await admin
    .from('jwl_meeting_rsvps')
    .upsert(
      { meeting_id, member_id: member.id, response, updated_at: new Date().toISOString() },
      { onConflict: 'meeting_id,member_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
