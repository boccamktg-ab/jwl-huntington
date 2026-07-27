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
  ] = await Promise.all([
    supabase.from('jwl_members').select('id, name, email').order('name'),
    supabase.from('districts').select('id, name').order('name'),
    supabase.from('schools').select('id, name, district_id').order('name'),
    supabase.from('children').select(`
      id, first_name, age, gender, gift_requests, gift_requests_en, top_size, bottom_size, shoe_size,
      families ( id, family_number, status, schools ( id, name, district_id, districts ( id, name ) ) )
    `),
    supabase.from('assignment_children').select('child_id'),
  ])

  const assignedIds = new Set(assignedLinks?.map(a => a.child_id) ?? [])

  const unassignedChildren = (allChildren ?? []).filter(c => {
    const fam = c.families as any
    return fam?.status === 'approved' && !assignedIds.has(c.id)
  }) as any[]

  return (
    <NewAssignmentForm
      members={members ?? []}
      districts={districts ?? []}
      schools={schools ?? []}
      children={unassignedChildren}
    />
  )
}
