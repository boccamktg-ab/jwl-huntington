import { isSuperAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

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
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">Grants — Reviewer</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/grants/reviewer" className="text-blue-100 hover:text-white">Applications</Link>
          <Link href="/members/dashboard" className="text-blue-100 hover:text-white">Holiday Charities</Link>
          <span className="text-blue-200">{member?.name ?? 'Admin'}</span>
          <form action="/api/auth/logout" method="POST">
            <button className="text-blue-200 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
