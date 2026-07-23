import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const { data, error } = await db().storage
    .from('grant-documents')
    .createSignedUrl(path, 60 * 60) // 1 hour

  if (error || !data?.signedUrl) {
    console.error('Signed URL error:', error, 'path:', path)
    return NextResponse.json({ error: error?.message ?? 'Could not generate file link', path }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
