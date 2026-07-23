'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TimeSlot = { label: string; capacity: number }

type Props = {
  event?: {
    id: string
    title: string
    location: string
    event_date: string
    start_time: string
    end_time: string | null
    volunteer_slots_total: number
    time_slots: TimeSlot[] | null
    credit_hours: number
    description: string | null
  }
}

export default function EventForm({ event }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: event?.title ?? '',
    location: event?.location ?? '',
    event_date: event?.event_date ?? '',
    start_time: event?.start_time ?? '',
    end_time: event?.end_time ?? '',
    volunteer_slots_total: String(event?.volunteer_slots_total ?? 0),
    credit_hours: String(event?.credit_hours ?? 1),
    description: event?.description ?? '',
  })
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(event?.time_slots ?? [])
  const [useSlots, setUseSlots] = useState((event?.time_slots ?? []).length > 0)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addSlot() {
    setTimeSlots(prev => [...prev, { label: '', capacity: 10 }])
  }

  function updateSlot(i: number, field: 'label' | 'capacity', value: string | number) {
    setTimeSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function removeSlot(i: number) {
    setTimeSlots(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const body = {
      ...form,
      volunteer_slots_total: parseInt(form.volunteer_slots_total) || 0,
      credit_hours: parseFloat(form.credit_hours) || 1,
      time_slots: useSlots && timeSlots.length > 0 ? timeSlots : null,
      event_id: event?.id,
    }

    const res = await fetch('/api/jjwl/admin/events', {
      method: event ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    router.push(event ? `/admin/jjwl/events/${event.id}` : '/admin/jjwl/events')
    router.refresh()
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input type="text" required value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
        <input type="text" required value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input type="date" required value={form.event_date} onChange={e => set('event_date', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start time *</label>
          <input type="time" required value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total volunteer slots <span className="text-gray-400 font-normal">(0 = unlimited)</span></label>
          <input type="number" min={0} value={form.volunteer_slots_total} onChange={e => set('volunteer_slots_total', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Credit hours *</label>
          <input type="number" min={0} step={0.5} required value={form.credit_hours} onChange={e => set('credit_hours', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
          className={`${inputCls} resize-none`} />
      </div>

      {/* Time slots */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input type="checkbox" checked={useSlots} onChange={e => setUseSlots(e.target.checked)}
            className="rounded border-gray-300 text-[#1B52C1]" />
          Use multiple time slots
        </label>
        {useSlots && (
          <div className="space-y-2 pl-6">
            {timeSlots.map((slot, i) => (
              <div key={i} className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Slot label (e.g. 9am–11am)"
                  value={slot.label}
                  onChange={e => updateSlot(i, 'label', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
                />
                <input
                  type="number" min={1}
                  value={slot.capacity}
                  onChange={e => updateSlot(i, 'capacity', parseInt(e.target.value) || 1)}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
                  title="Capacity"
                />
                <button type="button" onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
            <button type="button" onClick={addSlot}
              className="text-sm text-[#1B52C1] hover:underline">
              + Add slot
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-[#1B52C1] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
          {loading ? 'Saving…' : (event ? 'Save Changes' : 'Create Event')}
        </button>
        <a href={event ? `/admin/jjwl/events/${event.id}` : '/admin/jjwl/events'}
          className="text-sm text-gray-500 hover:text-gray-700 py-2">
          Cancel
        </a>
      </div>
    </form>
  )
}
