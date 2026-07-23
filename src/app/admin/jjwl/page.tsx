import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminJJWLPage() {
  const admin = db()

  const [
    { data: members },
    { data: events },
    { data: pendingSunset },
  ] = await Promise.all([
    admin.from('jjwl_members').select('id, status'),
    admin.from('jjwl_events').select('id, status').gte('event_date', new Date().toISOString().slice(0, 10)),
    admin
      .from('jjwl_events')
      .select('id')
      .eq('status', 'sunset')
      .lt('event_date', new Date().toISOString().slice(0, 10)),
  ])

  const pending = (members ?? []).filter(m => m.status === 'pending_approval').length
  const unpaid = (members ?? []).filter(m => m.status === 'approved_unpaid').length
  const active = (members ?? []).filter(m => m.status === 'active').length
  const upcomingEvents = events?.length ?? 0
  const needsReview = pendingSunset?.length ?? 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">JJWL Admin</h1>
        <Link href="/admin/jjwl/events/new"
          className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0]">
          + New Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Active members" value={active} color="green" />
        <Stat label="Pending approval" value={pending} color={pending > 0 ? 'amber' : 'gray'} />
        <Stat label="Awaiting payment" value={unpaid} color={unpaid > 0 ? 'amber' : 'gray'} />
        <Stat label="Upcoming events" value={upcomingEvents} color="blue" />
      </div>

      {/* Review queue */}
      {needsReview > 0 && (
        <Link href="/admin/jjwl/events?filter=sunset" className="block">
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-800">
                {needsReview} event{needsReview !== 1 ? 's' : ''} awaiting attendance review
              </p>
              <p className="text-sm text-amber-600 mt-0.5">Confirm attendance to award credit hours.</p>
            </div>
            <span className="text-amber-700 text-sm font-medium">Review →</span>
          </div>
        </Link>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <NavCard href="/admin/jjwl/members" title="Members" description="Review registrations, approve members, manage hour totals." />
        <NavCard href="/admin/jjwl/events" title="Events" description="Create, edit, and review events and attendance." />
        <NavCard href="/admin/jjwl/settings" title="Settings" description="Set CheddarUp payment link and other JJWL settings." />
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const cls: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-500',
  }
  return (
    <div className={`rounded-xl border p-4 ${cls[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  )
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-[#1B52C1] transition-colors">
      <h2 className="font-medium text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  )
}
