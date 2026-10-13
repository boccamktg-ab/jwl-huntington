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

// PATCH — update name, email, sw_type, organization, school assignments
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { name, email, swType, organization, schoolIds } = await request.json()

  const db = adminClient()

  const update: Record<string, any> = {}
  if (name !== undefined) update.name = name.trim()
  if (email !== undefined) update.email = email.trim().toLowerCase()
  if (swType !== undefined) update.sw_type = swType
  if (organization !== undefined) update.organization = organization || null

  if (Object.keys(update).length > 0) {
    const { error } = await db.from('social_workers').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace school assignments if provided
  if (schoolIds !== undefined) {
    await db.from('social_worker_schools').delete().eq('social_worker_id', id)
    if (schoolIds.length > 0) {
      const rows = schoolIds.map((school_id: string) => ({ social_worker_id: id, school_id }))
      const { error } = await db.from('social_worker_schools').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

// POST with action=reset_password — send password reset email via Supabase Auth
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { action } = await request.json()

  if (action !== 'reset_password') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const db = adminClient()

  const { data: sw } = await db
    .from('social_workers')
    .select('email, auth_id')
    .eq('id', id)
    .maybeSingle()

  if (!sw?.email) return NextResponse.json({ error: 'Social worker not found' }, { status: 404 })

  const { error } = await db.auth.admin.generateLink({
    type: 'recovery',
    email: sw.email,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
