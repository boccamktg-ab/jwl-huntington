import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const BASE = 'https://portal.jwlhuntington.org'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = db()

  // Look up the token
  const { data: invite } = await supabase
    .from('jwl_shift_invite_tokens')
    .select('shift_id, member_id, jwl_meeting_shifts(label, start_time, end_time, meeting_id)')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.redirect(`${BASE}/members/meetings?notice=invalid_token`)
  }

  // Sign them up
  await supabase
    .from('jwl_meeting_shift_signups')
    .upsert({ shift_id: invite.shift_id, member_id: invite.member_id }, { onConflict: 'shift_id,member_id', ignoreDuplicates: true })

  // Redirect to meetings page with a success notice
  return NextResponse.redirect(`${BASE}/members/meetings?notice=shift_signup`)
}
