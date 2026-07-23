import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailMemberChildrenAssigned } from '@/lib/email'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { memberId, childIds } = await request.json()
  if (!memberId || !childIds?.length) {
    return NextResponse.json({ error: 'Missing memberId or childIds' }, { status: 400 })
  }

  const db = adminClient()

  const { data: assignment, error: aErr } = await db
    .from('assignments')
    .insert({ jwl_member_id: memberId })
    .select('id')
    .single()

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  const links = childIds.map((child_id: string) => ({
    assignment_id: assignment.id,
    child_id,
  }))

  const { error: lErr } = await db.from('assignment_children').insert(links)
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  // Email the member
  const { data: member } = await db
    .from('jwl_members')
    .select('name, email')
    .eq('id', memberId)
    .maybeSingle()
  if (member?.email) {
    const { subject, html } = emailMemberChildrenAssigned(
      member.name,
      childIds.length,
      `You have been assigned ${childIds.length} child${childIds.length !== 1 ? 'ren' : ''} for the Holiday Charities program.`,
    )
    await sendEmail({ to: member.email, subject, html })
  }

  return NextResponse.json({ id: assignment.id })
}
