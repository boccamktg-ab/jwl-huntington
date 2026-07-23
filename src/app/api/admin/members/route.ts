import { NextRequest, NextResponse } from 'next/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH — approve / disable / enable a member
export async function PATCH(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { memberId, action } = await request.json()
  if (action === 'toggle_admin') {
    const { data: member } = await db().from('jwl_members').select('is_admin').eq('id', memberId).single()
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { error } = await db().from('jwl_members').update({ is_admin: !member.is_admin }).eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_grants_reviewer') {
    const { data: member } = await db().from('jwl_members').select('is_grants_reviewer').eq('id', memberId).single()
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { error } = await db().from('jwl_members').update({ is_grants_reviewer: !member.is_grants_reviewer }).eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_jjwl_admin') {
    const { data: member } = await db().from('jwl_members').select('is_jjwl_admin').eq('id', memberId).single()
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { error } = await db().from('jwl_members').update({ is_jjwl_admin: !member.is_jjwl_admin }).eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_super_admin') {
    const { data: member } = await db().from('jwl_members').select('is_super_admin').eq('id', memberId).single()
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { error } = await db().from('jwl_members').update({ is_super_admin: !member.is_super_admin }).eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const statusMap: Record<string, string> = {
    approve: 'approved',
    disable: 'disabled',
    enable:  'approved',
  }
  const newStatus = statusMap[action]
  if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const { error } = await db()
    .from('jwl_members')
    .update({ status: newStatus })
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — hard delete a JWL member (nulls assignments, preserves data)
export async function DELETE(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { memberId } = await request.json()
  if (!memberId) return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })

  const admin = db()

  const { data: member } = await admin
    .from('jwl_members')
    .select('auth_id')
    .eq('id', memberId)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin.from('jwl_members').delete().eq('id', memberId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (member.auth_id) {
    await admin.auth.admin.deleteUser(member.auth_id)
  }

  return NextResponse.json({ ok: true })
}

// POST — admin creates a JWL member directly (pre-approved, auto-creates login)
export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, email, childrenRequested } = await request.json()
  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const admin = db()

  // Create auth user; they'll use "Forgot password" to set their own password
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  const { error: insertErr } = await admin.from('jwl_members').insert({
    name,
    email,
    auth_id: authData.user.id,
    children_requested: childrenRequested ?? null,
    status: 'approved',
  })
  if (insertErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
