import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, getPortalAdminEmails, emailAdminNewMember } from '@/lib/email'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { name, email, password, childrenRequested } = await request.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: memberError } = await supabase
    .from('jwl_members')
    .insert({
      name,
      email,
      auth_id: authData.user.id,
      status: 'pending',
      children_requested: childrenRequested ?? null,
    })

  if (memberError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  const adminEmails = await getPortalAdminEmails()
  if (adminEmails.length > 0) {
    const { subject, html } = emailAdminNewMember(name, email)
    await sendEmail({ to: adminEmails, subject, html })
  }

  return NextResponse.json({ ok: true })
}
