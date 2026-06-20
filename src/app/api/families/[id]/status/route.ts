import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function swClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = swClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sw } = await supabase.from('social_workers').select('id').eq('auth_id', user.id).single()
  if (!sw) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { status } = await request.json()
  if (!['submitted', 'approved'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { status }
  if (status === 'submitted') updates.submitted_at = new Date().toISOString()
  if (status === 'approved') updates.approved_at = new Date().toISOString()

  const { error } = await supabase
    .from('families')
    .update(updates)
    .eq('id', id)
    .eq('social_worker_id', sw.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
