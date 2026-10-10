import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkSubmissionsAllowed } from '@/lib/checkSubmissions'

function swClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
}

export async function POST(request: NextRequest) {
  const supabase = swClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sw } = await supabase.from('social_workers').select('id').eq('auth_id', user.id).single()
  if (!sw) return NextResponse.json({ error: 'Social worker not found' }, { status: 404 })

  const { allowed, message } = await checkSubmissionsAllowed(sw.id)
  if (!allowed) return NextResponse.json({ error: message }, { status: 403 })

  const body = await request.json()

  // Bulk create: array of families
  if (Array.isArray(body)) {
    const rows = body.map((f: any) => ({
      family_number: f.familyNumber,
      family_surname: f.familySurname || null,
      num_children: f.numChildren,
      school_id: f.schoolId,
      social_worker_id: sw.id,
      language_pref: f.languagePref ?? 'en',
      status: 'draft',
    }))
    const { data, error } = await supabase.from('families').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ids: data.map((d: any) => d.id) })
  }

  // Single create
  const { familyNumber, familySurname, numChildren, schoolId, languagePref } = body
  const { data, error } = await supabase
    .from('families')
    .insert({
      family_number: familyNumber,
      family_surname: familySurname || null,
      num_children: numChildren,
      school_id: schoolId,
      social_worker_id: sw.id,
      language_pref: languagePref,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
