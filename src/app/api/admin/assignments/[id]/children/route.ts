import { NextRequest, NextResponse } from 'next/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail, emailMemberChildrenAssigned } from '@/lib/email'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function notifyMemberOfAssignmentChange(assignmentId: string, changeDescription: string) {
  const { data: assignment } = await db()
    .from('assignments')
    .select('jwl_member_id')
    .eq('id', assignmentId)
    .maybeSingle()
  if (!assignment) return

  const { data: member } = await db()
    .from('jwl_members')
    .select('name, email')
    .eq('id', assignment.jwl_member_id)
    .maybeSingle()
  if (!member?.email) return

  const { count } = await db()
    .from('assignment_children')
    .select('*', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId)

  const { subject, html } = emailMemberChildrenAssigned(member.name, count ?? 0, changeDescription)
  await sendEmail({ to: member.email, subject, html })
}

// DELETE — remove a child from this assignment (makes them available for reassignment)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { childId } = await request.json()

  const { error } = await db()
    .from('assignment_children')
    .delete()
    .eq('assignment_id', id)
    .eq('child_id', childId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await notifyMemberOfAssignmentChange(id, 'A child has been removed from your assignment.')
  return NextResponse.json({ ok: true })
}

// POST — add more children to an existing assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { childIds } = await request.json()
  if (!childIds?.length) return NextResponse.json({ error: 'No children provided' }, { status: 400 })

  const { error } = await db()
    .from('assignment_children')
    .insert(childIds.map((child_id: string) => ({ assignment_id: id, child_id })))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await notifyMemberOfAssignmentChange(
    id,
    `${childIds.length} child${childIds.length !== 1 ? 'ren have' : ' has'} been added to your assignment.`,
  )
  return NextResponse.json({ ok: true })
}
