import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const { data } = await db()
    .from('member_positions')
    .select('*')
    .order('sort_order')
  return NextResponse.json({ positions: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { label, allows_detail } = await request.json()
  if (!label?.trim()) return NextResponse.json({ error: 'Label required' }, { status: 400 })

  // Place new item just before General Member (highest sort_order active)
  const { data: max } = await db()
    .from('member_positions')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await db()
    .from('member_positions')
    .insert({ label: label.trim(), allows_detail: !!allows_detail, sort_order: (max?.sort_order ?? 10) + 1 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ position: data })
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id, label, allows_detail, sort_order, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (label !== undefined) update.label = label.trim()
  if (allows_detail !== undefined) update.allows_detail = allows_detail
  if (sort_order !== undefined) update.sort_order = sort_order
  if (is_active !== undefined) update.is_active = is_active

  const { error } = await db().from('member_positions').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Check if any members use this position
  const { count } = await db()
    .from('jwl_members')
    .select('*', { count: 'exact', head: true })
    .eq('position_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `${count} member(s) use this position. Reassign them first.` }, { status: 409 })
  }

  const { error } = await db().from('member_positions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
