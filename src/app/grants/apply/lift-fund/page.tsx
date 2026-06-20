import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LiftFundForm from './LiftFundForm'

export default async function LiftFundPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sw } = await supabase
    .from('social_workers')
    .select('id, name, email')
    .eq('auth_id', user.id)
    .single()

  if (!sw) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">The Lift Fund</h1>
        <p className="text-sm text-gray-500 mt-1">
          Emergency financial aid up to $3,000, one-time, for families in the Town of Huntington facing a financial crisis. Substantial proof of financial sustainability is required. Strict confidentiality is maintained for all applicants.
        </p>
      </div>
      <LiftFundForm referrerId={sw.id} referrerName={sw.name} referrerEmail={sw.email ?? ''} />
    </div>
  )
}
