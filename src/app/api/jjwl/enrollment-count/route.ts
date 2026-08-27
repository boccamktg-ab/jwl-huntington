import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CAP = 85

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const { count } = await db()
    .from('jjwl_members')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("inactive","waitlisted")')

  const enrolled = count ?? 0
  return NextResponse.json({ enrolled, cap: CAP, remaining: Math.max(0, CAP - enrolled) })
}
