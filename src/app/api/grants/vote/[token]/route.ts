import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailGrantVoteConfirmation, emailGrantMoreInfoReceived, getPortalAdminEmails } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const VOTE_LABELS = { yes: 'Approve', no: 'Deny', more_info: 'Request More Information' }

function confirmationHtml(vote: string, memberName: string) {
  const label = VOTE_LABELS[vote as keyof typeof VOTE_LABELS] ?? vote
  const icon = vote === 'yes' ? '✅' : vote === 'no' ? '❌' : '❓'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vote Recorded</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
  .card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:40px;max-width:440px;text-align:center;}
  .icon{font-size:48px;margin-bottom:16px;}
  h1{font-size:22px;font-weight:700;color:#111827;margin:0 0 12px;}
  p{font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;}
  a{display:inline-block;background:#1B52C1;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;}
  </style></head><body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>Vote Recorded</h1>
    <p>Hi ${memberName}, your vote of <strong>${label}</strong> has been recorded. The grants admin will review all votes before making a final decision.</p>
    <a href="https://portal.jwlhuntington.org/members">Return to portal</a>
  </div></body></html>`
}

// GET — one-click yes/no from email link
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const v = request.nextUrl.searchParams.get('v')

  if (!token || (v !== 'yes' && v !== 'no')) {
    return new NextResponse('Invalid link.', { status: 400 })
  }

  const supabase = db()

  const { data: voteRow } = await supabase
    .from('grant_member_votes')
    .select('id, application_id, member_id, vote, jwl_members(name, email)')
    .eq('token', token)
    .maybeSingle()

  if (!voteRow) {
    return new NextResponse('This voting link is invalid or has expired.', { status: 404 })
  }

  const { data: app } = await supabase
    .from('grant_applications')
    .select('vote_status')
    .eq('id', voteRow.application_id)
    .single()

  if (app?.vote_status !== 'open') {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Voting Closed</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;}
      .card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:40px;max-width:440px;text-align:center;}
      </style></head><body><div class="card"><div style="font-size:48px">🔒</div>
      <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 12px;">Voting is not open</h1>
      <p style="font-size:15px;color:#6b7280;">This vote is currently ${app?.vote_status ?? 'closed'}. No further votes are being accepted.</p>
      </div></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  }

  const member = (voteRow as any).jwl_members

  await supabase
    .from('grant_member_votes')
    .update({ vote: v, voted_at: new Date().toISOString() })
    .eq('id', voteRow.id)

  if (member?.email) {
    const payload = emailGrantVoteConfirmation(member.name, v as 'yes' | 'no' | 'more_info')
    await sendEmail({ to: member.email, subject: payload.subject, html: payload.html })
  }

  return new NextResponse(confirmationHtml(v, member?.name ?? 'Member'), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

// PATCH — from the vote page (portal or public) for all vote types including more_info
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { vote, notes } = await request.json()

  if (!token || !['yes', 'no', 'more_info'].includes(vote)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (vote === 'more_info' && !notes?.trim()) {
    return NextResponse.json({ error: 'A question is required when requesting more information.' }, { status: 400 })
  }

  const supabase = db()

  const { data: voteRow } = await supabase
    .from('grant_member_votes')
    .select('id, application_id, member_id, vote, jwl_members(name, email)')
    .eq('token', token)
    .maybeSingle()

  if (!voteRow) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const { data: app } = await supabase
    .from('grant_applications')
    .select('id, vote_status')
    .eq('id', voteRow.application_id)
    .single()

  if (app?.vote_status !== 'open') {
    return NextResponse.json({ error: 'Voting is not currently open for this application.' }, { status: 409 })
  }

  const member = (voteRow as any).jwl_members

  await supabase
    .from('grant_member_votes')
    .update({ vote, notes: notes?.trim() ?? null, voted_at: new Date().toISOString() })
    .eq('id', voteRow.id)

  if (vote === 'more_info') {
    // Pause the vote
    await supabase
      .from('grant_applications')
      .update({ vote_status: 'paused' })
      .eq('id', app.id)

    // Email all admins/reviewers
    const adminEmails = await getPortalAdminEmails()
    for (const email of adminEmails) {
      const payload = emailGrantMoreInfoReceived('Grants Admin', member?.name ?? 'A member', notes.trim(), app.id)
      await sendEmail({ to: email, subject: payload.subject, html: payload.html })
    }
  }

  if (member?.email) {
    const payload = emailGrantVoteConfirmation(member.name, vote)
    await sendEmail({ to: member.email, subject: payload.subject, html: payload.html })
  }

  return NextResponse.json({ ok: true })
}
