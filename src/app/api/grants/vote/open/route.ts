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

export async function POST(request: NextRequest) {
  if (!await requireGrantsReviewerFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { application_id, vote_summary } = await request.json()
  if (!application_id || !vote_summary?.trim()) {
    return NextResponse.json({ error: 'application_id and vote_summary are required' }, { status: 400 })
  }

  const supabase = db()

  const { data: app } = await supabase
    .from('grant_applications')
    .select('id, vote_status, status')
    .eq('id', application_id)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (app.vote_status === 'open') return NextResponse.json({ error: 'Vote is already open' }, { status: 409 })

  // Get all active general members
  const { data: members } = await supabase
    .from('jwl_members')
    .select('id, name, email')
    .eq('status', 'approved')
    .not('email', 'is', null)

  if (!members?.length) {
    return NextResponse.json({ error: 'No eligible members found' }, { status: 400 })
  }

  // Upsert vote rows for all members (preserves existing votes if resuming from paused)
  for (const m of members) {
    await supabase
      .from('grant_member_votes')
      .upsert(
        { application_id, member_id: m.id },
        { onConflict: 'application_id,member_id', ignoreDuplicates: true }
      )
  }

  // Fetch all vote rows to get tokens
  const { data: votes } = await supabase
    .from('grant_member_votes')
    .select('token, member_id')
    .eq('application_id', application_id)

  const tokenByMember = Object.fromEntries((votes ?? []).map(v => [v.member_id, v.token]))

  // Update application
  await supabase
    .from('grant_applications')
    .update({ vote_summary: vote_summary.trim(), vote_status: 'open' })
    .eq('id', application_id)

  // Send emails to members who haven't voted yet
  const { data: alreadyVoted } = await supabase
    .from('grant_member_votes')
    .select('member_id')
    .eq('application_id', application_id)
    .not('vote', 'is', null)

  const votedSet = new Set((alreadyVoted ?? []).map(v => v.member_id))

  let sent = 0
  for (const m of members) {
    if (votedSet.has(m.id)) continue
    const token = tokenByMember[m.id]
    if (!token || !m.email) continue

    const payload = emailGrantMemberVote(
      m.name,
      vote_summary.trim(),
      `${BASE}/api/grants/vote/${token}?v=yes`,
      `${BASE}/api/grants/vote/${token}?v=no`,
      `${BASE}/vote/${token}`,
    )
    await sendEmail({ to: m.email, subject: payload.subject, html: payload.html })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
