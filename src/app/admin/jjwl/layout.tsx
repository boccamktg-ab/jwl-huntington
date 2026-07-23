import { isSuperAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

export default async function AdminJJWLLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = isSuperAdminEmail(user.email)
  if (isSuperAdmin) return <>{children}</>

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: member } = await db
    .from('jwl_members')
    .select('is_admin, is_super_admin, is_programs_admin, is_jjwl_admin, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (member?.is_admin || member?.is_super_admin || member?.is_programs_admin || (member?.is_jjwl_admin && member?.status === 'approved')) {
    return <>{children}</>
  }

  redirect('/login')
}
