import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import EventSignupButton from './EventSignupButton'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function JJWLEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = db()

  const { data: member } = await admin
    .from('jjwl_members')
    .select('id, name, phone, status')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!member || member.status !== 'active') redirect('/jjwl/pending')

  const { data: evt } = await admin
    .from('jjwl_events')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!evt) notFound()

  const { data: signup } = await admin
    .from('jjwl_signups')
    .select('id, status, time_slot')
    .eq('event_id', id)
    .eq('member_id', member.id)
    .maybeSingle()

  const { data: signupCounts } = await admin
    .from('jjwl_signups')
    .select('time_slot')
    .eq('event_id', id)
    .in('status', ['signed_up', 'confirmed_attended'])

  const totalFilled = signupCounts?.length ?? 0
  const full = evt.volunteer_slots_total > 0 && totalFilled >= evt.volunteer_slots_total

  const timeSlots: { label: string; capacity: number }[] = evt.time_slots ?? []

  // Count per-slot
  const slotCounts: Record<string, number> = {}
  for (const s of signupCounts ?? []) {
    if (s.time_slot) slotCounts[s.time_slot] = (slotCounts[s.time_slot] ?? 0) + 1
  }

  const isSignedUp = signup?.status === 'signed_up'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <a href="/jjwl/events" className="text-sm text-gray-400 hover:text-gray-600">← Back to events</a>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">{evt.title}</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row label="Date" value={new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} />
          {evt.start_time && (
            <Row label="Time" value={`${evt.start_time.slice(0, 5)}${evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ''}`} />
          )}
          <Row label="Location" value={evt.location} />
          <Row label="Credit hours" value={`${Number(evt.credit_hours).toFixed(1)} hr${evt.credit_hours !== 1 ? 's' : ''}`} />
          {evt.volunteer_slots_total > 0 && (
            <Row label="Spots" value={`${totalFilled} of ${evt.volunteer_slots_total} filled`} />
          )}
        </div>

        {evt.description && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">About this event</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{evt.description}</p>
          </div>
        )}
      </div>

      <EventSignupButton
        eventId={evt.id}
        memberId={member.id}
        memberName={member.name}
        memberPhone={member.phone}
        isSignedUp={isSignedUp}
        currentSlot={signup?.time_slot ?? null}
        isFull={full && !isSignedUp}
        timeSlots={timeSlots}
        slotCounts={slotCounts}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
