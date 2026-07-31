import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireGrantsReviewerFromRequest } from '@/lib/admin'
import { sendEmail, emailGrantMemberVote } from '@/lib/email'

const BASE = 'https://portal.jwlhuntington.org'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — fetch tally for an application
export async function GET(request: NextRequest) {
  if (!await requireGrantsReviewerFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const applicationId = request.nextUrl.searchParams.get('application_id')
  if (!applicationId) return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })

  const supabase = db()

  const { data: votes } = await supabase
    .from('grant_member_votes')
    .select('vote, notes, voted_at, jwl_members(name)')
    .eq('application_id', applicationId)
    .order('voted_at', { ascending: true })

  const tally = { yes: 0, no: 0, more_info: 0, pending: 0 }
  const details: { name: string; vote: string | null; notes: string | null; voted_at: string | null }[] = []

  for (const v of votes ?? []) {
    const member = (v as any).jwl_members
    if (v.vote === 'yes') tally.yes++
    else if (v.vote === 'no') tally.no++
    else if (v.vote === 'more_info') tally.more_info++
    else tally.pending++
    details.push({ name: member?.name ?? '—', vote: v.vote, notes: v.notes, voted_at: v.voted_at })
  }

  return NextResponse.json({ tally, details })
}

// PATCH — close, pause, or resume a vote
export async function PATCH(request: NextRequest) {
  if (!await requireGrantsReviewerFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { application_id, action } = await request.json()
  if (!application_id || !['close', 'resume'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = db()
  const newStatus = action === 'close' ? 'closed' : 'open'

  await supabase
    .from('grant_applications')
    .update({ vote_status: newStatus })
    .eq('id', application_id)

  if (action === 'resume') {
    // Re-send emails to members who haven't voted yet
    const { data: votes } = await supabase
      .from('grant_member_votes')
      .select('token, member_id, vote, jwl_members(name, email)')
      .eq('application_id', application_id)

    const { data: app } = await supabase
      .from('grant_applications')
      .select('vote_summary')
      .eq('id', application_id)
      .single()

    let sent = 0
    for (const v of votes ?? []) {
      if (v.vote) continue // already voted
      const member = (v as any).jwl_members
      if (!member?.email || !app?.vote_summary) continue

      const payload = emailGrantMemberVote(
        member.name,
        app.vote_summary,
        `${BASE}/api/grants/vote/${v.token}?v=yes`,
        `${BASE}/api/grants/vote/${v.token}?v=no`,
        `${BASE}/vote/${v.token}`,
      )
      await sendEmail({ to: member.email, subject: payload.subject, html: payload.html })
      sent++
    }
    return NextResponse.json({ ok: true, sent })
  }

  return NextResponse.json({ ok: true })
}
