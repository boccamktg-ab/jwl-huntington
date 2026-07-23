import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

export default async function JJWLLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: member } = await db
    .from('jjwl_members')
    .select('name, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member) redirect('/login')
  if (member.status === 'pending_approval') redirect('/jjwl/pending')
  if (member.status === 'approved_unpaid') redirect('/jjwl/pending?payment=1')
  if (member.status === 'inactive') redirect('/login?notice=disabled')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">JJWL</span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/jjwl/dashboard" className="text-blue-100 hover:text-white">My Hours</Link>
          <Link href="/jjwl/events" className="text-blue-100 hover:text-white">Events</Link>
          <Link href="/jjwl/account" className="text-blue-100 hover:text-white">Account</Link>
          <span className="text-blue-200 border-l border-blue-400 pl-4">{member.name}</span>
          <form action="/api/auth/logout" method="POST">
            <button className="text-blue-200 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
