import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sw } = await supabase
    .from('social_workers')
    .select('name, status')
    .eq('auth_id', user.id)
    .single()

  if (!sw) redirect('/login')
  if (sw.status !== 'approved') redirect('/login?notice=pending')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">Holiday Charities</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-blue-100 hover:text-white">My Families</Link>
          <Link href="/dashboard/profile" className="text-blue-100 hover:text-white">My Profile</Link>
          <span className="text-blue-200">{sw.name}</span>
          <form action="/api/auth/logout" method="POST">
            <button className="text-blue-200 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
