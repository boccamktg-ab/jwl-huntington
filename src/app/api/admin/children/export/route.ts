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

  const { data: children } = await db
    .from('children')
    .select(`
      id, first_name, age, gender,
      gift_requests, gift_requests_en, translation_status,
      top_size, bottom_size, shoe_size, created_at,
      families (
        family_number, status, language_pref,
        schools ( name, districts ( name ) ),
        social_workers ( name, email )
      )
    `)
    .order('created_at')

  const approved = (children ?? []).filter(c => (c.families as any)?.status === 'approved')

  const headers = [
    'Child ID', 'First Name', 'Age', 'Gender',
    'Gift Requests (Original)', 'Gift Requests (English)', 'Translation Status',
    'Top Size', 'Bottom Size', 'Shoe Size',
    'Family #', 'Family Language', 'School', 'District',
    'Social Worker', 'SW Email', 'Added At',
  ]

  const rows = approved.map(c => {
    const fam = c.families as any
    return [
      c.id,
      c.first_name,
      c.age ?? '',
      c.gender ?? '',
      c.gift_requests ?? '',
      c.gift_requests_en ?? '',
      c.translation_status ?? '',
      c.top_size ?? '',
      c.bottom_size ?? '',
      c.shoe_size ?? '',
      fam?.family_number ?? '',
      fam?.language_pref ?? '',
      fam?.schools?.name ?? '',
      fam?.schools?.districts?.name ?? '',
      fam?.social_workers?.name ?? '',
      fam?.social_workers?.email ?? '',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
    ].map(esc).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="children-${date}.csv"`,
    },
  })
}
