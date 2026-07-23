import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import EventForm from '../../EventForm'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: evt } = await db().from('jjwl_events').select('*').eq('id', id).maybeSingle()
  if (!evt) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <a href={`/admin/jjwl/events/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← Back to event</a>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Edit Event</h1>
      </div>
      <EventForm event={{
        id: evt.id,
        title: evt.title,
        location: evt.location,
        event_date: evt.event_date,
        start_time: evt.start_time,
        end_time: evt.end_time,
        volunteer_slots_total: evt.volunteer_slots_total,
        time_slots: evt.time_slots,
        credit_hours: evt.credit_hours,
        description: evt.description,
      }} />
    </div>
  )
}
