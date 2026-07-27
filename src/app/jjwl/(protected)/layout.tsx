import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import SimpleNav from '@/components/SimpleNav'

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
      <SimpleNav
        title="JJWL"
        userName={member.name}
        links={[
          { href: '/jjwl/dashboard', label: 'My Hours' },
          { href: '/jjwl/events', label: 'Events' },
          { href: '/jjwl/waiver', label: 'Waiver' },
          { href: '/jjwl/account', label: 'Account' },
        ]}
      />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
