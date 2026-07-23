import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function parseProgramYear(year: string): { start: Date; end: Date } | null {
  // e.g. "2024–25" or "2024-25"
  const m = year.match(/(\d{4})[–-](\d{2,4})/)
  if (!m) return null
  const startYear = parseInt(m[1])
  return {
    start: new Date(`${startYear}-08-01`),
    end: new Date(`${startYear + 1}-05-31T23:59:59`),
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const admin = db()
  const { data: member } = await admin
    .from('jjwl_members')
    .select('id, name, grade, status, schools(name)')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member || member.status !== 'active') return new NextResponse('Forbidden', { status: 403 })

  const yearParam = request.nextUrl.searchParams.get('year') ?? ''
  const bounds = parseProgramYear(yearParam)

  const [{ data: signups }, { data: adjustments }] = await Promise.all([
    admin
      .from('jjwl_signups')
      .select('hours_awarded, confirmed_at, jjwl_events(title, event_date)')
      .eq('member_id', member.id)
      .eq('status', 'confirmed_attended'),
    admin
      .from('jjwl_hour_adjustments')
      .select('delta, reason, adjusted_at')
      .eq('member_id', member.id),
  ])

  const filteredSignups = bounds
    ? (signups ?? []).filter(s => {
        const evt = Array.isArray(s.jjwl_events) ? s.jjwl_events[0] : s.jjwl_events
        if (!evt?.event_date) return false
        const d = new Date(evt.event_date)
        return d >= bounds.start && d <= bounds.end
      })
    : (signups ?? [])

  const filteredAdj = bounds
    ? (adjustments ?? []).filter(a => {
        const d = new Date(a.adjusted_at)
        return d >= bounds.start && d <= bounds.end
      })
    : (adjustments ?? [])

  const totalHours = filteredSignups.reduce((sum, s) => sum + Number(s.hours_awarded ?? 0), 0)
    + filteredAdj.reduce((sum, a) => sum + Number(a.delta), 0)

  const school = Array.isArray(member.schools) ? member.schools[0] : member.schools

  // Build a simple HTML certificate that the browser can print to PDF
  const eventRows = filteredSignups.map(s => {
    const evt = Array.isArray(s.jjwl_events) ? s.jjwl_events[0] : s.jjwl_events
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${evt?.title ?? '—'}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${evt?.event_date ? new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—'}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${Number(s.hours_awarded ?? 0).toFixed(1)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>JJWL Certificate — ${member.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, sans-serif; background: white; color: #111827; }
    .page { max-width: 750px; margin: 0 auto; padding: 60px 48px; }
    .header { text-align: center; border-bottom: 3px solid #1B52C1; padding-bottom: 32px; margin-bottom: 40px; }
    .logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
    .logo-text { font-size: 20px; font-weight: 700; color: #1B52C1; }
    h1 { font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #6b7280; }
    .member-info { background: #f0f4ff; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .member-name { font-size: 22px; font-weight: 700; color: #1B52C1; margin-bottom: 4px; }
    .hours-big { font-size: 48px; font-weight: 700; color: #1B52C1; line-height: 1; }
    .hours-label { font-size: 14px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    thead th { text-align: left; padding: 8px 12px; background: #f9fafb; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    thead th:last-child { text-align: right; }
    .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #9ca3af; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-row">
        <span class="logo-text">Junior Junior Welfare League of Huntington</span>
      </div>
      <h1>Volunteer Hour Certificate</h1>
      <p class="subtitle">Program Year ${yearParam || 'All Years'}</p>
    </div>

    <div class="member-info">
      <p class="member-name">${member.name}</p>
      <p class="subtitle">Grade ${member.grade}${school ? ` · ${(school as any).name}` : ''}</p>
      <div style="margin-top:16px;">
        <span class="hours-big">${totalHours.toFixed(1)}</span>
        <p class="hours-label">total credit hours</p>
      </div>
    </div>

    ${filteredSignups.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Event</th>
          <th>Date</th>
          <th style="text-align:right;">Hours</th>
        </tr>
      </thead>
      <tbody>
        ${eventRows}
        <tr style="background:#f9fafb;font-weight:600;">
          <td colspan="2" style="padding:8px 12px;">Total</td>
          <td style="padding:8px 12px;text-align:right;">${totalHours.toFixed(1)}</td>
        </tr>
      </tbody>
    </table>
    ` : '<p style="color:#6b7280;font-size:14px;">No confirmed events for this period.</p>'}

    <div class="footer">
      <p>Junior Welfare League of Huntington · portal.jwlhuntington.org</p>
      <p style="margin-top:4px;">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>
  </div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
