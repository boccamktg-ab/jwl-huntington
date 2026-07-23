import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  // Also allow JWL members with is_admin = true
  let isMemberAdmin = false
  if (!isSuperAdmin) {
    const db = adminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await db
      .from('jwl_members')
      .select('is_admin')
      .eq('auth_id', user.id)
      .eq('is_admin', true)
      .maybeSingle()
    isMemberAdmin = !!data
  }

  if (!isSuperAdmin && !isMemberAdmin) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">JWL — Admin</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/admin" className="text-blue-100 hover:text-white">Dashboard</Link>
          <Link href="/admin/children" className="text-blue-100 hover:text-white">Children</Link>
          <Link href="/admin/assignments" className="text-blue-100 hover:text-white">Assignments</Link>
          <Link href="/admin/social-workers" className="text-blue-100 hover:text-white">Social Workers</Link>
          <Link href="/admin/members" className="text-blue-100 hover:text-white">Members</Link>
          <Link href="/admin/setup" className="text-blue-100 hover:text-white">Setup</Link>
          <Link href="/grants/reviewer" className="text-blue-100 hover:text-white">Grants</Link>
          <Link href="/admin/jjwl" className="text-blue-100 hover:text-white">JJWL</Link>
          {isMemberAdmin && (
            <Link href="/members/dashboard" className="text-blue-100 hover:text-white">My Assignment</Link>
          )}
          <form action="/api/auth/logout" method="POST">
            <button className="text-blue-200 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
