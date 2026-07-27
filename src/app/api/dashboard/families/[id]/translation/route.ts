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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: familyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify this SW owns the family
  const { data: sw } = await supabase
    .from('social_workers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!sw) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: family } = await db()
    .from('families')
    .select('id, social_worker_id')
    .eq('id', familyId)
    .single()

  if (!family || family.social_worker_id !== sw.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { childId, giftRequestsEn } = await request.json()
  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 })

  const { error } = await db()
    .from('children')
    .update({
      gift_requests_en: giftRequestsEn ?? null,
      translation_status: 'confirmed',
    })
    .eq('id', childId)
    .eq('family_id', familyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
