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

async function requireGrantsReviewer(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await db()
    .from('jwl_members')
    .select('id, status, is_grants_reviewer')
    .eq('auth_id', user.id)
    .single()

  if (!member || member.status !== 'approved' || !member.is_grants_reviewer) return null
  return { user, member }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireGrantsReviewer(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { application_id, action, approved_amount, denial_reason } = await request.json()

  if (!application_id || !action) {
    return NextResponse.json({ error: 'Missing application_id or action' }, { status: 400 })
  }

  const validActions = ['under_review', 'needs_more_info', 'approve', 'deny', 'paid_closed']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const updates: Record<string, any> = {
    reviewer_id: auth.member.id,
    updated_at: new Date().toISOString(),
  }

  if (action === 'approve') {
    if (!approved_amount || approved_amount <= 0) {
      return NextResponse.json({ error: 'approved_amount required' }, { status: 400 })
    }
    updates.status = 'approved'
    updates.approved_amount = approved_amount
  } else if (action === 'deny') {
    if (!denial_reason?.trim()) {
      return NextResponse.json({ error: 'denial_reason required' }, { status: 400 })
    }
    updates.status = 'denied'
    updates.denial_reason = denial_reason.trim()
  } else if (action === 'paid_closed') {
    updates.status = 'paid_closed'
    updates.closed_at = new Date().toISOString()
  } else {
    updates.status = action
  }

  const { error } = await db()
    .from('grant_applications')
    .update(updates)
    .eq('id', application_id)

  if (error) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
