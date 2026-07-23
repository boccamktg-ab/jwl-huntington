import { NextRequest, NextResponse } from 'next/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { sendEmail, getPortalAdminEmails, emailAdminChildrenRequested } from '@/lib/email'

function adminClient() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childrenRequested } = await request.json()
  const db = adminClient()

  // Fetch current value so we can compare and build a meaningful notification
  const { data: member } = await db
    .from('jwl_members')
    .select('name, children_requested')
    .eq('auth_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await db
    .from('jwl_members')
    .update({ children_requested: childrenRequested ?? null })
    .eq('auth_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Only notify if the value actually changed
  const prev = member.children_requested
  const next = childrenRequested ?? null
  if (prev !== next) {
    const direction = next === null ? 'cleared their request'
      : prev === null ? `set their children requested to ${next}`
      : next > prev ? `increased their children requested from ${prev} to ${next}`
      : `decreased their children requested from ${prev} to ${next}`

    const changeMsg = `${member.name} ${direction}.`

    await db.from('admin_notifications').insert({
      type: 'children_requested_change',
      message: changeMsg,
    })

    const adminEmails = await getPortalAdminEmails()
    if (adminEmails.length > 0) {
      const { subject, html } = emailAdminChildrenRequested(member.name, changeMsg)
      await sendEmail({ to: adminEmails, subject, html })
    }
  }

  return NextResponse.json({ ok: true })
}
