import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

export default async function JJWLPendingPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const params = await searchParams
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
  if (member.status === 'active') redirect('/jjwl/dashboard')

  // Fetch CheddarUp URL from settings
  const { data: setting } = await db
    .from('app_settings')
    .select('value')
    .eq('key', 'jjwl_cheddarup_url')
    .maybeSingle()
  const cheddarUpUrl = setting?.value ?? null

  const needsPayment = member.status === 'approved_unpaid' || params.payment === '1'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">JJWL</span>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button className="text-blue-200 text-sm hover:text-white">Sign out</button>
        </form>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
          {needsPayment ? (
            <>
              <div className="text-4xl">💳</div>
              <h1 className="text-xl font-semibold text-gray-900">One last step!</h1>
              <p className="text-sm text-gray-600">
                Your registration has been approved, {member.name.split(' ')[0]}! To activate your account, please complete your membership dues payment.
              </p>
              {cheddarUpUrl ? (
                <a href={cheddarUpUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-[#1B52C1] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#1540A0]">
                  Pay Membership Dues →
                </a>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                  Please check your email for the payment link, or contact JWL for assistance.
                </p>
              )}
              <p className="text-xs text-gray-400">Your account will be activated once payment is confirmed by an admin.</p>
            </>
          ) : (
            <>
              <div className="text-4xl">⏳</div>
              <h1 className="text-xl font-semibold text-gray-900">Registration Pending</h1>
              <p className="text-sm text-gray-600">
                Hi {member.name.split(' ')[0]}! Your application is under review. You&apos;ll receive an email once it&apos;s been approved.
              </p>
            </>
          )}
          <Link href="/login" className="block text-xs text-gray-400 hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
