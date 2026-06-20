import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await db()
      .from('jwl_members')
      .select('id, status, is_grants_reviewer')
      .eq('auth_id', user.id)
      .single()

    if (!member || member.status !== 'approved' || !member.is_grants_reviewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { application_id, body } = await request.json()

    if (!application_id || !body?.trim()) {
      return NextResponse.json({ error: 'Missing application_id or body' }, { status: 400 })
    }

    const { data: app } = await db()
      .from('grant_applications')
      .select('id, status')
      .eq('id', application_id)
      .single()

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (['approved', 'denied', 'paid_closed'].includes(app.status)) {
      return NextResponse.json({ error: 'Cannot message on a closed application' }, { status: 400 })
    }

    const { error } = await db()
      .from('grant_messages')
      .insert({ application_id, author_id: user.id, body: body.trim() })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
