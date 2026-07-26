'use client'

import { useState, useEffect } from 'react'

type Meeting = {
  id: string
  title: string
  meeting_date: string
  meeting_time: string
  location: string
  agenda_notes: string | null
  post_meeting_notes: string | null
  status: 'draft' | 'published' | 'completed'
  jwl_meeting_rsvps: { id: string; response: string }[]
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h % 12) || 12)}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Meeting | null>(null)
  const [sending, setSending] = useState<Record<string, string>>({})

  // Form state
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [agenda, setAgenda] = useState('')
  const [recap, setRecap] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/meetings')
    const json = await res.json()
    setMeetings(json.meetings ?? [])
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setTitle(''); setDate(''); setTime(''); setLocation(''); setAgenda(''); setRecap('')
    setShowForm(true)
  }

  function openEdit(m: Meeting) {
    setEditing(m)
    setTitle(m.title); setDate(m.meeting_date); setTime(m.meeting_time)
    setLocation(m.location); setAgenda(m.agenda_notes ?? ''); setRecap(m.post_meeting_notes ?? '')
    setShowForm(true)
  }

  async function save() {
    setSaving(true)
    if (editing) {
      await fetch('/api/admin/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, title, meeting_date: date, meeting_time: time, location, agenda_notes: agenda, post_meeting_notes: recap }),
      })
    } else {
      await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, meeting_date: date, meeting_time: time, location, agenda_notes: agenda }),
      })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function deleteMeeting(id: string) {
    if (!confirm('Delete this meeting?')) return
    await fetch('/api/admin/meetings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  async function notify(meetingId: string, type: string, label: string) {
    if (!confirm(`Send "${label}" emails to all members?`)) return
    setSending(s => ({ ...s, [meetingId + type]: 'sending' }))
    const res = await fetch('/api/admin/meetings/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: meetingId, type }),
    })
    const json = await res.json()
    setSending(s => ({ ...s, [meetingId + type]: `Sent to ${json.sent}` }))
    load()
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">JWL Meetings</h1>
        <button onClick={openNew}
          className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0]">
          + New meeting
        </button>
      </div>

      {meetings.length === 0 && <p className="text-sm text-gray-400">No meetings yet.</p>}

      <div className="space-y-4">
        {meetings.map(m => {
          const yesCount = m.jwl_meeting_rsvps?.filter(r => r.response === 'yes').length ?? 0
          const noCount = m.jwl_meeting_rsvps?.filter(r => r.response === 'no').length ?? 0
          return (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[m.status]}`}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{m.title}</h2>
                  <p className="text-sm text-gray-500">{fmtDate(m.meeting_date)} at {fmtTime(m.meeting_time)} · {m.location}</p>
                  {m.agenda_notes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{m.agenda_notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-gray-700">{yesCount} attending</p>
                  <p className="text-xs text-gray-400">{noCount} declined</p>
                </div>
              </div>

              {/* Notification actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {m.status === 'draft' && (
                  <NotifyBtn label="Publish & notify all" meetingId={m.id} type="published" sending={sending} onSend={notify} color="blue" />
                )}
                {m.status === 'published' && (
                  <>
                    <NotifyBtn label="Send 1-week reminder" meetingId={m.id} type="reminder_7" sending={sending} onSend={notify} color="amber" />
                    <NotifyBtn label="Send 1-day reminder" meetingId={m.id} type="reminder_1" sending={sending} onSend={notify} color="amber" />
                  </>
                )}
                {(m.status === 'published' || m.status === 'completed') && m.post_meeting_notes && (
                  <NotifyBtn label="Send recap" meetingId={m.id} type="recap" sending={sending} onSend={notify} color="green" />
                )}
                <button onClick={() => openEdit(m)}
                  className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                  Edit
                </button>
                <button onClick={() => deleteMeeting(m.id)}
                  className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                  Delete
                </button>
              </div>

              {m.post_meeting_notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Recap notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{m.post_meeting_notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit meeting' : 'New meeting'}</h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Meeting title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Monthly Membership Meeting" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Huntington Town Hall" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agenda highlights <span className="text-gray-400">(optional)</span></label>
              <textarea rows={3} value={agenda} onChange={e => setAgenda(e.target.value)} placeholder="Key topics or items for the meeting…" className={inputCls} />
            </div>
            {editing && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Post-meeting recap notes <span className="text-gray-400">(after the meeting)</span></label>
                <textarea rows={4} value={recap} onChange={e => setRecap(e.target.value)} placeholder="Meeting notes, decisions made, follow-up items…" className={inputCls} />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving || !title || !date || !time || !location}
                className="flex-1 bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NotifyBtn({ label, meetingId, type, sending, onSend, color }: {
  label: string; meetingId: string; type: string
  sending: Record<string, string>; onSend: (id: string, type: string, label: string) => void; color: string
}) {
  const key = meetingId + type
  const state = sending[key]
  const colorCls = {
    blue: 'border-blue-200 text-blue-700 hover:bg-blue-50',
    amber: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    green: 'border-green-200 text-green-700 hover:bg-green-50',
  }[color] ?? 'border-gray-200 text-gray-700 hover:bg-gray-50'

  return (
    <button onClick={() => onSend(meetingId, type, label)} disabled={!!state}
      className={`text-xs px-3 py-1.5 border rounded-lg disabled:opacity-60 ${colorCls}`}>
      {state ?? label}
    </button>
  )
}
