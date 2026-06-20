import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CharitableChildrenForm from './CharitableChildrenForm'

export default async function CharitableChildrenPage() {
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
        <h1 className="text-2xl font-semibold text-gray-900">Charitable Children Grant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Up to $1,000 per child (lifetime). Child must reside in the Town of Huntington and be under 18 or currently enrolled in public school.
        </p>
      </div>
      <CharitableChildrenForm referrerId={sw.id} referrerName={sw.name} referrerEmail={sw.email ?? ''} />
    </div>
  )
}
