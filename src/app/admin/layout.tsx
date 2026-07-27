import { isSuperAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = isSuperAdminEmail(user.email)

  let member: { is_admin: boolean; is_super_admin: boolean; is_programs_admin: boolean; is_jjwl_admin: boolean; is_grants_reviewer: boolean } | null = null

  if (!isSuperAdmin) {
    const db = adminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await db
      .from('jwl_members')
      .select('is_admin, is_super_admin, is_programs_admin, is_jjwl_admin, is_grants_reviewer')
      .eq('auth_id', user.id)
      .maybeSingle()
    member = data
  }

  const hasAccess = isSuperAdmin || member?.is_admin || member?.is_super_admin || member?.is_programs_admin || member?.is_jjwl_admin || member?.is_grants_reviewer
  if (!hasAccess) redirect('/login')

  const dbSuperAdmin = isSuperAdmin || !!member?.is_super_admin
  const isMemberAdmin = dbSuperAdmin || !!member?.is_admin
  const isProgramsAdmin = dbSuperAdmin || !!member?.is_programs_admin
  const isJjwlAdmin = dbSuperAdmin || !!member?.is_jjwl_admin
  const isGrantsReviewer = dbSuperAdmin || !!member?.is_grants_reviewer

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav
        isMemberAdmin={isMemberAdmin}
        isProgramsAdmin={isProgramsAdmin}
        isJjwlAdmin={isJjwlAdmin}
        isGrantsReviewer={isGrantsReviewer}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
