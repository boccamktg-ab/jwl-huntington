import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'
import ChangePasswordForm from './ChangePasswordForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: sw }, { data: districts }, { data: schools }, { data: swSchools }] = await Promise.all([
    supabase.from('social_workers').select('id, name, email, phone').eq('auth_id', user.id).single(),
    service.from('districts').select('id, name').order('name'),
    service.from('schools').select('id, name, district_id').order('name'),
    supabase.from('social_worker_schools').select('school_id').eq('social_worker_id',
      (await supabase.from('social_workers').select('id').eq('auth_id', user.id).single()).data?.id ?? ''
    ),
  ])

  if (!sw) redirect('/login')

  const currentSchoolIds = swSchools?.map(s => s.school_id) ?? []
  const currentDistrict = schools?.find(s => currentSchoolIds.includes(s.id))?.district_id ?? ''

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
      <ProfileForm
        sw={sw}
        districts={districts ?? []}
        schools={schools ?? []}
        currentSchoolIds={currentSchoolIds}
        currentDistrictId={currentDistrict}
      />
      <ChangePasswordForm />
    </div>
  )
}
