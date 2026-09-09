import { createClient } from '@supabase/supabase-js'
import SiteNav from '@/app/(auth)/SiteNav'
import Link from 'next/link'
import RegisterForm from './RegisterForm'

export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function JJWLRegisterPage() {
  const { data } = await db()
    .from('app_settings')
    .select('value')
    .eq('key', 'jjwl_registration_open')
    .maybeSingle()

  // Default open unless explicitly set to 'false'
  const registrationOpen = data?.value !== 'false'

  if (!registrationOpen) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteNav />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h1 className="text-xl font-semibold text-gray-900">Registration Closed</h1>
            <p className="text-sm text-gray-600">
              Registration for the 2026–2027 JJWL season is currently closed.
            </p>
            <p className="text-sm text-gray-500">
              If you believe this is an error or have questions, please contact us at{' '}
              <a href="mailto:jbrady8116@gmail.com" className="text-[#1B52C1] underline">jbrady8116@gmail.com</a>.
            </p>
            <Link href="/login" className="inline-block text-sm text-[#1B52C1] hover:underline mt-2">
              Already a member? Sign in →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <RegisterForm />
}
