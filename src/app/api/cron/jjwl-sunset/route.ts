import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await db()
    .from('jjwl_events')
    .update({ status: 'sunset' })
    .eq('status', 'active')
    .lt('event_date', today)
    .select('id, title')

  if (error) {
    console.error('[jjwl-sunset]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[jjwl-sunset] Sunsetted ${data?.length ?? 0} events`)
  return NextResponse.json({ sunsetted: data?.length ?? 0 })
}
