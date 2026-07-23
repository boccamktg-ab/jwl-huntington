import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import ProfileForm from './ProfileForm'
import EmailPasswordForm from './EmailPasswordForm'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function JJWLAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await db()
    .from('jjwl_members')
    .select('id, name, grade, phone, parent_name, parent_phone, parent_email, schools(name)')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member) redirect('/login')

  const school = Array.isArray(member.schools) ? member.schools[0] : member.schools

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>

      {/* Read-only info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-600 space-y-1">
        <p><span className="text-gray-400">Name:</span> {member.name}</p>
        <p><span className="text-gray-400">Grade:</span> {member.grade}</p>
        {school && <p><span className="text-gray-400">School:</span> {(school as any).name}</p>}
        <p className="text-xs text-gray-400 pt-1">To update your name, grade, or school contact an administrator.</p>
      </div>

      {/* Contact info */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Contact Information</h2>
        <ProfileForm
          memberId={member.id}
          initialPhone={member.phone}
          initialParentName={member.parent_name ?? ''}
          initialParentPhone={member.parent_phone ?? ''}
          initialParentEmail={member.parent_email ?? ''}
        />
      </div>

      {/* Email & password */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Email & Password</h2>
        <EmailPasswordForm currentEmail={user.email ?? ''} />
      </div>
    </div>
  )
}
