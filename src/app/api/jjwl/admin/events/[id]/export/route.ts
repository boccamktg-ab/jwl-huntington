import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireJJWLAdminUser } from '@/lib/admin'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function csvEscape(val: string | null | undefined) {
  const s = val ?? ''
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!await requireJJWLAdminUser()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = db()

  const [{ data: evt }, { data: signups }] = await Promise.all([
    admin.from('jjwl_events').select('title, event_date').eq('id', id).single(),
    admin
      .from('jjwl_signups')
      .select('status, time_slot, hours_awarded, signed_up_at, jjwl_members(name, email, phone, grade, school)')
      .eq('event_id', id)
      .order('signed_up_at', { ascending: true }),
  ])

  if (!evt) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const rows = (signups ?? []).filter(s => s.status !== 'cancelled')

  const headers = ['Name', 'Grade', 'School', 'Email', 'Phone', 'Time Slot', 'Status', 'Hours Awarded', 'Signed Up At']

  const lines = [
    headers.join(','),
    ...rows.map(s => {
      const m: any = Array.isArray(s.jjwl_members) ? s.jjwl_members[0] : s.jjwl_members
      return [
        csvEscape(m?.name),
        csvEscape(m?.grade),
        csvEscape(m?.school),
        csvEscape(m?.email),
        csvEscape(m?.phone),
        csvEscape(s.time_slot),
        csvEscape(s.status),
        csvEscape(s.hours_awarded != null ? String(s.hours_awarded) : ''),
        csvEscape(s.signed_up_at ? new Date(s.signed_up_at).toLocaleString('en-US') : ''),
      ].join(',')
    }),
  ]

  const slug = evt.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const dateStr = evt.event_date.slice(0, 10)
  const filename = `jjwl-${slug}-${dateStr}.csv`

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
