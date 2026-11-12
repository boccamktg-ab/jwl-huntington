import { createClient } from '@supabase/supabase-js'
import NewAssignmentForm from './NewAssignmentForm'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function NewAssignmentPage() {
  const supabase = adminClient()

  const [
    { data: members },
    { data: districts },
    { data: schools },
    { data: allChildren },
    { data: assignedLinks },
    { data: assignmentMemberLinks },
  ] = await Promise.all([
    supabase.from('jwl_members').select('id, name, email, children_requested').order('name'),
    supabase.from('districts').select('id, name').order('name'),
    supabase.from('schools').select('id, name, district_id').order('name'),
    supabase.from('children').select(`
      id, first_name, age, gender, gift_requests, gift_requests_en, top_size, bottom_size, shoe_size,
      families ( id, family_number, status, schools ( id, name, district_id, districts ( id, name ) ) )
    `),
    supabase.from('assignment_children').select('child_id'),
    supabase.from('assignments').select('jwl_member_id, assignment_children(child_id)'),
  ])

  const assignedIds = new Set(assignedLinks?.map(a => a.child_id) ?? [])

  // Build a map of member_id → total children currently assigned across all their assignments
  const assignedCountByMember = new Map<string, number>()
  for (const a of assignmentMemberLinks ?? []) {
    const count = (a.assignment_children as any[])?.length ?? 0
    const prev = assignedCountByMember.get(a.jwl_member_id) ?? 0
    assignedCountByMember.set(a.jwl_member_id, prev + count)
  }

  const membersWithCounts = (members ?? []).map(m => ({
    ...m,
    children_assigned: assignedCountByMember.get(m.id) ?? 0,
  }))

  const unassignedChildren = (allChildren ?? []).filter(c => {
    const fam = c.families as any
    return fam?.status === 'approved' && !assignedIds.has(c.id)
  }) as any[]

  return (
    <NewAssignmentForm
      members={membersWithCounts}
      districts={districts ?? []}
      schools={schools ?? []}
      children={unassignedChildren}
    />
  )
}
