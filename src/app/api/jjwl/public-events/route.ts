import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await db()
    .from('jjwl_events')
    .select('id, title, location, event_date, start_time, end_time, credit_hours, description, volunteer_slots_total')
    .eq('status', 'active')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data ?? [] }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=300',
    },
  })
}
