import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// One-click RSVP — no login required. Token is unique per member per meeting.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const response = request.nextUrl.searchParams.get('response')

  if (!token || (response !== 'yes' && response !== 'no')) {
    return new NextResponse('Invalid link.', { status: 400 })
  }

  const supabase = db()

  const { data: rsvp, error } = await supabase
    .from('jwl_meeting_rsvps')
    .select('id, meeting_id, response, jwl_meetings(meeting_date, location, title)')
    .eq('token', token)
    .single()

  if (error || !rsvp) {
    return new NextResponse('This RSVP link is invalid or has expired.', { status: 404 })
  }

  await supabase
    .from('jwl_meeting_rsvps')
    .update({ response, updated_at: new Date().toISOString() })
    .eq('token', token)

  const meeting = (rsvp as any).jwl_meetings
  const dateStr = meeting?.meeting_date
    ? new Date(meeting.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'the meeting'

  const message = response === 'yes'
    ? `You're confirmed! We'll see you at the JWL meeting on ${dateStr}.`
    : `Got it — you've marked yourself as not attending the ${dateStr} meeting. You can always change this by clicking the "Yes" link in the original email.`

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RSVP Confirmed</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
    .card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:40px;max-width:440px;text-align:center;}
    .icon{font-size:48px;margin-bottom:16px;}
    h1{font-size:22px;font-weight:700;color:#111827;margin:0 0 12px;}
    p{font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;}
    a{display:inline-block;background:#1B52C1;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;}
    </style></head><body>
    <div class="card">
      <div class="icon">${response === 'yes' ? '✅' : '👋'}</div>
      <h1>${response === 'yes' ? 'RSVP Confirmed!' : 'Response Recorded'}</h1>
      <p>${message}</p>
      <a href="https://portal.jwlhuntington.org/members/meetings">View meetings</a>
    </div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
