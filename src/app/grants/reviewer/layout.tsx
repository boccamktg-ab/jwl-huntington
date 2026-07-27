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

export default async function GrantsReviewerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = isSuperAdminEmail(user.email)

  const { data: member } = await db()
    .from('jwl_members')
    .select('name, status, is_grants_reviewer, is_admin')
    .eq('auth_id', user.id)
    .maybeSingle()

  const isAdmin = isSuperAdmin || (member?.is_admin ?? false)
  const isReviewer = member?.status === 'approved' && (member?.is_grants_reviewer ?? false)

  if (!isAdmin && !isReviewer) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNav
        title="Grants — Reviewer"
        userName={member?.name ?? 'Admin'}
        links={[
          { href: '/grants/reviewer', label: 'Applications' },
          { href: '/members/dashboard', label: 'My Dashboard' },
        ]}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
