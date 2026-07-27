import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SimpleNav from '@/components/SimpleNav'

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
      <SimpleNav
        title="Holiday Charities"
        userName={sw.name}
        links={[
          { href: '/dashboard', label: 'My Families' },
          { href: '/dashboard/profile', label: 'My Profile' },
          { href: '/grants', label: 'Grants Portal' },
        ]}
      />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
