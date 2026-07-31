import { isSuperAdminEmail } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import AdminNewGrantForm from './AdminNewGrantForm'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminNewGrantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const isSuperAdmin = isSuperAdminEmail(user.email)
  const { data: member } = await db()
    .from('jwl_members')
    .select('is_admin, is_super_admin, is_grants_reviewer, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  const canAccess = isSuperAdmin || member?.is_super_admin || member?.is_admin ||
    (member?.status === 'approved' && member?.is_grants_reviewer)
  if (!canAccess) return notFound()

  // Approved social workers for assignment
  const { data: socialWorkers } = await db()
    .from('social_workers')
    .select('id, name, email, type')
    .eq('status', 'approved')
    .order('name', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">New Grant Application</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter an application on behalf of an external referrer (phone, email, walk-in). Optionally assign it to a portal social worker who will manage it from their dashboard.
        </p>
      </div>
      <AdminNewGrantForm socialWorkers={socialWorkers ?? []} />
    </div>
  )
}
