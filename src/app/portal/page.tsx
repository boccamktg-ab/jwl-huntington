import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sw } = await supabase
    .from('social_workers')
    .select('name, status, sw_type')
    .eq('auth_id', user.id)
    .single()

  if (!sw) redirect('/login')
  if (sw.status === 'pending') redirect('/dashboard')
  // Community SWs go straight to grants — no HC intake
  if (sw.sw_type === 'community') redirect('/grants')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">Junior Welfare League</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-200">{sw.name}</span>
          <form action="/api/auth/logout" method="POST">
            <button className="text-blue-200 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome, {sw.name.split(' ')[0]}</h1>
          <p className="text-gray-500 mt-1 text-sm">What would you like to do today?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          <Link
            href="/dashboard"
            className="group bg-white border border-gray-200 rounded-2xl p-8 hover:border-[#1B52C1] hover:shadow-md transition-all text-left space-y-3"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-100 transition-colors">
              🎁
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Holiday Charities</h2>
              <p className="text-sm text-gray-500 mt-1">
                Submit families and children for holiday gift assistance.
              </p>
            </div>
            <span className="inline-block text-sm font-medium text-[#1B52C1] group-hover:underline">
              Go to Holiday Charities →
            </span>
          </Link>

          <Link
            href="/grants"
            className="group bg-white border border-gray-200 rounded-2xl p-8 hover:border-[#1B52C1] hover:shadow-md transition-all text-left space-y-3"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-100 transition-colors">
              📋
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Grants Portal</h2>
              <p className="text-sm text-gray-500 mt-1">
                Apply for a Charitable Children Grant or the Lift Fund on behalf of a child or family.
              </p>
            </div>
            <span className="inline-block text-sm font-medium text-[#1B52C1] group-hover:underline">
              Go to Grants →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
