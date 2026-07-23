import EventForm from '../EventForm'

export default function NewEventPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <a href="/admin/jjwl/events" className="text-sm text-gray-400 hover:text-gray-600">← Back to events</a>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">New Event</h1>
      </div>
      <EventForm />
    </div>
  )
}
