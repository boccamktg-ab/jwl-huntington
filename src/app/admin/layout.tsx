import { isSuperAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

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

  const isFullAdmin = isSuperAdmin || !!(member?.is_admin || member?.is_super_admin)
  const isProgramsAdmin = isFullAdmin || !!member?.is_programs_admin
  const isJjwlAdmin = isFullAdmin || !!member?.is_jjwl_admin
  const isGrantsReviewer = isFullAdmin || !!member?.is_grants_reviewer

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">JWL — Admin</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          {isProgramsAdmin && <Link href="/admin" className="text-blue-100 hover:text-white">Dashboard</Link>}
          {isProgramsAdmin && <Link href="/admin/children" className="text-blue-100 hover:text-white">Children</Link>}
          {isProgramsAdmin && <Link href="/admin/assignments" className="text-blue-100 hover:text-white">Assignments</Link>}
          {isProgramsAdmin && <Link href="/admin/social-workers" className="text-blue-100 hover:text-white">Social Workers</Link>}
          {isFullAdmin && <Link href="/admin/members" className="text-blue-100 hover:text-white">Members</Link>}
          {isFullAdmin && <Link href="/admin/setup" className="text-blue-100 hover:text-white">Setup</Link>}
          {isGrantsReviewer && <Link href="/grants/reviewer" className="text-blue-100 hover:text-white">Grants</Link>}
          {isJjwlAdmin && <Link href="/admin/jjwl" className="text-blue-100 hover:text-white">JJWL</Link>}
          <Link href="/members/dashboard" className="text-blue-100 hover:text-white">My Dashboard</Link>
          <form action="/api/auth/logout" method="POST">
            <button className="text-blue-200 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
