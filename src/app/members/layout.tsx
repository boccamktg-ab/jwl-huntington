import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import MembersNav from '@/components/MembersNav'

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: member } = await db
    .from('jwl_members')
    .select('name, status, is_admin, is_super_admin, is_programs_admin, is_grants_reviewer, is_jjwl_admin')
    .eq('auth_id', user.id)
    .single()

  if (!member) redirect('/login')

  if (member.status === 'pending') redirect('/login?notice=pending')
  if (member.status === 'disabled') redirect('/login?notice=disabled')

  return (
    <div className="min-h-screen bg-gray-50">
      <MembersNav
        memberName={member.name}
        isGrantsReviewer={!!member.is_grants_reviewer}
        isProgramsAdmin={!!member.is_programs_admin}
        isJjwlAdmin={!!member.is_jjwl_admin}
        isAdmin={!!member.is_admin}
        isSuperAdmin={!!member.is_super_admin}
      />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
