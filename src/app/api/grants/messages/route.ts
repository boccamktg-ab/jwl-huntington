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

    const { application_id, body } = await req.json()

    if (!application_id || !body?.trim()) {
      return NextResponse.json({ error: 'Missing application_id or body' }, { status: 400 })
    }

    // Verify referrer owns this application and it's still active
    const { data: app } = await supabase
      .from('grant_applications')
      .select('id, status')
      .eq('id', application_id)
      .eq('referrer_id', sw.id)
      .single()

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (['approved', 'denied', 'paid_closed'].includes(app.status)) {
      return NextResponse.json({ error: 'Cannot message on a closed application' }, { status: 400 })
    }

    const service = await createServiceClient()
    const { error } = await service
      .from('grant_messages')
      .insert({ application_id, author_id: user.id, body: body.trim() })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
