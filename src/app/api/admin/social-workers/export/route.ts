import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function esc(v: string | null | undefined) {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = adminClient()

  const [{ data: sws }, { data: families }] = await Promise.all([
    db
      .from('social_workers')
      .select(`
        id, name, email, status, sw_type, organization, intake_complete, submissions_enabled, created_at,
        social_worker_schools ( schools ( name, districts ( name ) ) )
      `)
      .order('created_at', { ascending: false }),
    db
      .from('families')
      .select('social_worker_id, status'),
  ])

  // Count families per SW
  const familyCounts: Record<string, { total: number; approved: number }> = {}
  for (const f of families ?? []) {
    if (!familyCounts[f.social_worker_id]) familyCounts[f.social_worker_id] = { total: 0, approved: 0 }
    familyCounts[f.social_worker_id].total++
    if (f.status === 'approved') familyCounts[f.social_worker_id].approved++
  }

  const headers = [
    'Name', 'Email', 'Status', 'Type', 'Organization / Schools',
    'Intake Complete', 'Submissions Enabled',
    'Families (Total)', 'Families (Approved)', 'Registered',
  ]

  const rows = (sws ?? []).map(sw => {
    const affiliation = sw.sw_type === 'community'
      ? sw.organization ?? ''
      : (sw.social_worker_schools as any[])
          ?.map((s: any) => `${s.schools?.name} (${s.schools?.districts?.name})`)
          .join('; ') ?? ''
    const counts = familyCounts[sw.id] ?? { total: 0, approved: 0 }
    return [
      sw.name,
      sw.email,
      sw.status,
      sw.sw_type,
      affiliation,
      sw.intake_complete ? 'Yes' : 'No',
      (sw.submissions_enabled ?? true) ? 'Yes' : 'No',
      counts.total,
      counts.approved,
      new Date(sw.created_at).toLocaleDateString(),
    ].map(esc).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="social-workers-${date}.csv"`,
    },
  })
}
