import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { type, name, districtId } = await request.json()

  if (type === 'district') {
    const { error } = await adminClient().from('districts').insert({ name })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (type === 'school') {
    const { error } = await adminClient().from('schools').insert({ name, district_id: districtId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { schoolId, code } = await request.json()
  if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

  const { error } = await adminClient().from('schools').update({ code: code || null }).eq('id', schoolId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { type, id } = await request.json()

  if (type === 'school') {
    const { error } = await adminClient().from('schools').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
