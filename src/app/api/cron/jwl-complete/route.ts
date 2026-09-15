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
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await db()
    .from('jwl_meetings')
    .update({ status: 'completed' })
    .eq('status', 'published')
    .lt('meeting_date', today)
    .select('id, title')

  if (error) {
    console.error('[jwl-complete]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[jwl-complete] Completed ${data?.length ?? 0} meetings/events`)
  return NextResponse.json({ completed: data?.length ?? 0 })
}
