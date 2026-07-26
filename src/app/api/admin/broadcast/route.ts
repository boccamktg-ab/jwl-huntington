import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailBroadcastSeasonOpen, emailBroadcastDeadlineReminder } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminFromRequest(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { message_type, deadline, filter } = await request.json()
  // filter: 'all' | 'no_submissions' — for deadline reminder
  if (!['season_open', 'deadline_reminder'].includes(message_type)) {
    return NextResponse.json({ error: 'Invalid message_type' }, { status: 400 })
  }

  const supabase = db()

  // Fetch all approved social workers
  const { data: workers } = await supabase
    .from('social_workers')
    .select('id, name, email, status')
    .eq('status', 'approved')

  if (!workers?.length) return NextResponse.json({ ok: true, sent: 0 })

  // For deadline reminder with no_submissions filter, check who hasn't submitted
  let targets = workers
  if (message_type === 'deadline_reminder' && filter === 'no_submissions') {
    const { data: submittedSWIds } = await supabase
      .from('families')
      .select('social_worker_id')
      .in('status', ['submitted', 'approved'])
    const submittedSet = new Set((submittedSWIds ?? []).map((r: any) => r.social_worker_id))
    targets = workers.filter(w => !submittedSet.has(w.id))
  }

  // Send emails
  let sent = 0
  for (const sw of targets) {
    if (!sw.email) continue
    let subject: string, html: string
    if (message_type === 'season_open') {
      ;({ subject, html } = emailBroadcastSeasonOpen(sw.name))
    } else {
      const hasSubmissions = filter !== 'no_submissions'
      ;({ subject, html } = emailBroadcastDeadlineReminder(sw.name, deadline ?? 'the upcoming deadline', hasSubmissions))
    }
    await sendEmail({ to: sw.email, subject, html })
    sent++
  }

  // Log the send
  const adminUser = admin as { email?: string }
  await supabase.from('broadcast_send_log').insert({
    sent_by: adminUser.email ?? 'admin',
    message_type,
    subject: message_type === 'season_open' ? 'JWL Holiday Charities — We\'re now accepting family submissions' : 'JWL Holiday Charities — Submission deadline reminder',
    body_preview: message_type === 'deadline_reminder' && deadline ? `Deadline: ${deadline}` : null,
    recipient_count: sent,
  })

  return NextResponse.json({ ok: true, sent })
}

export async function GET(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: logs } = await db()
    .from('broadcast_send_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ logs: logs ?? [] })
}
