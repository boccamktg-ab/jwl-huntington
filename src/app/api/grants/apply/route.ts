import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sw } = await supabase
      .from('social_workers')
      .select('id, status')
      .eq('auth_id', user.id)
      .single()

    if (!sw || sw.status !== 'approved') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    const body = await req.json()
    const { grant_type, status, requested_amount, details } = body

    if (!['charitable_children', 'lift_fund'].includes(grant_type)) {
      return NextResponse.json({ error: 'Invalid grant type' }, { status: 400 })
    }

    const service = await createServiceClient()

    const { data: app, error: appError } = await service
      .from('grant_applications')
      .insert({
        grant_type,
        status,
        requested_amount,
        referrer_id: sw.id,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (appError || !app) {
      console.error(appError)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    const { error: detailError } = await service
      .from('grant_application_details')
      .insert({ application_id: app.id, ...details })

    if (detailError) {
      console.error(detailError)
      // Clean up orphaned application
      await service.from('grant_applications').delete().eq('id', app.id)
      return NextResponse.json({ error: 'Failed to save application details' }, { status: 500 })
    }

    return NextResponse.json({ id: app.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
