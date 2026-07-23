import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, getPortalAdminEmails, emailAdminNewSocialWorker } from '@/lib/email'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { name, email, password, schoolIds } = await request.json()

  if (!name || !email || !password || !schoolIds?.length) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const supabase = adminClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Create social_worker row (status = pending)
  const { data: sw, error: swError } = await supabase
    .from('social_workers')
    .insert({ name, email, auth_id: authData.user.id, status: 'pending' })
    .select('id')
    .single()

  if (swError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: swError.message }, { status: 500 })
  }

  // Link schools
  const schoolLinks = schoolIds.map((school_id: string) => ({
    social_worker_id: sw.id,
    school_id,
  }))
  await supabase.from('social_worker_schools').insert(schoolLinks)

  // Notify admins
  const { data: schoolRows } = await supabase
    .from('schools')
    .select('name')
    .in('id', schoolIds)
  const schoolNames = (schoolRows ?? []).map((s: any) => s.name).join(', ') || 'Unknown'
  const adminEmails = await getPortalAdminEmails()
  if (adminEmails.length > 0) {
    const { subject, html } = emailAdminNewSocialWorker(name, email, schoolNames)
    await sendEmail({ to: adminEmails, subject, html })
  }

  return NextResponse.json({ ok: true })
}
