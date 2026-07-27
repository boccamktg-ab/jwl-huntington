import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { isSuperAdminEmail } from '@/lib/admin'
import MembersNav from '@/components/MembersNav'

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const superAdmin = isSuperAdminEmail(user.email)

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let memberName = 'Admin'
  let memberFlags = { is_admin: false, is_super_admin: false, is_programs_admin: false, is_grants_reviewer: false, is_jjwl_admin: false }

  if (!superAdmin) {
    const { data: member } = await db
      .from('jwl_members')
      .select('name, status, is_admin, is_super_admin, is_programs_admin, is_grants_reviewer, is_jjwl_admin')
      .eq('auth_id', user.id)
      .single()

    if (!member) redirect('/login')
    if (member.status === 'pending') redirect('/login?notice=pending')
    if (member.status === 'disabled') redirect('/login?notice=disabled')

    memberName = member.name
    memberFlags = member
  } else {
    // Super admin by email — look up their member record if it exists, for display name
    const { data: member } = await db
      .from('jwl_members')
      .select('name, is_admin, is_super_admin, is_programs_admin, is_grants_reviewer, is_jjwl_admin')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (member) {
      memberName = member.name
      memberFlags = { ...member, is_super_admin: true }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MembersNav
        memberName={memberName}
        isGrantsReviewer={superAdmin || !!memberFlags.is_grants_reviewer}
        isProgramsAdmin={superAdmin || !!memberFlags.is_programs_admin}
        isJjwlAdmin={superAdmin || !!memberFlags.is_jjwl_admin}
        isAdmin={superAdmin || !!memberFlags.is_admin}
        isSuperAdmin={superAdmin || !!memberFlags.is_super_admin}
      />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
