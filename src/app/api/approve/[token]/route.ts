import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const PORTAL = 'https://portal.jwlhuntington.org'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = db()

  const { data: record } = await admin
    .from('approval_tokens')
    .select('id, entity_type, entity_id, used_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!record) {
    return NextResponse.redirect(`${PORTAL}/admin?approval=invalid`)
  }
  if (record.used_at) {
    return NextResponse.redirect(`${PORTAL}/admin?approval=already_used`)
  }
  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.redirect(`${PORTAL}/admin?approval=expired`)
  }

  // Mark token used
  await admin
    .from('approval_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', record.id)

  if (record.entity_type === 'social_worker') {
    const { error } = await admin
      .from('social_workers')
      .update({ status: 'approved' })
      .eq('id', record.entity_id)

    if (error) return NextResponse.redirect(`${PORTAL}/admin?approval=error`)
    return NextResponse.redirect(`${PORTAL}/admin/social-workers?approval=success`)
  }

  if (record.entity_type === 'jwl_member') {
    const { error } = await admin
      .from('jwl_members')
      .update({ status: 'approved' })
      .eq('id', record.entity_id)

    if (error) return NextResponse.redirect(`${PORTAL}/admin?approval=error`)
    return NextResponse.redirect(`${PORTAL}/admin/members?approval=success`)
  }

  return NextResponse.redirect(`${PORTAL}/admin?approval=invalid`)
}
