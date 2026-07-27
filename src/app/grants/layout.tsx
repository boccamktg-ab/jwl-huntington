import { isSuperAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import SimpleNav from '@/components/SimpleNav'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function GrantsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admins and grants reviewers bypass this layout — their own nested layout handles auth
  const isSuperAdmin = isSuperAdminEmail(user.email)
  if (isSuperAdmin) return <>{children}</>

  const { data: member } = await db()
    .from('jwl_members')
    .select('is_admin, is_grants_reviewer, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (member?.is_admin || (member?.is_grants_reviewer && member?.status === 'approved')) {
    return <>{children}</>
  }

  // Social worker path
  const { data: sw } = await supabase
    .from('social_workers')
    .select('name, status')
    .eq('auth_id', user.id)
    .single()

  if (!sw) redirect('/login')
  if (sw.status !== 'approved') redirect('/login?notice=pending')

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNav
        title="Grants Portal"
        userName={sw.name}
        links={[
          { href: '/grants', label: 'My Applications' },
          { href: '/dashboard', label: 'Holiday Charities' },
        ]}
      />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
