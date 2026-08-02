'use client'

import { useState, useEffect, useRef } from 'react'

type Shift = { id?: string; label: string; start_time: string; end_time: string; signupCount?: number }

type Meeting = {
  id: string
  title: string
  meeting_date: string
  meeting_time: string
  end_time: string | null
  location: string
  agenda_notes: string | null
  description: string | null
  meeting_type: 'meeting' | 'event'
  post_meeting_notes: string | null
  status: 'draft' | 'published' | 'completed'
  jwl_meeting_rsvps: { id: string; response: string; jwl_members: { name: string } | null }[]
  jwl_meeting_shifts: (Shift & { jwl_meeting_shift_signups: { id: string; jwl_members: { name: string } | null }[] })[]
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h % 12) || 12)}:${m.toString().padStart(2, '0')} ${ampm}`
}

const BLANK_SHIFT: Shift = { label: '', start_time: '', end_time: '' }

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Meeting | null>(null)
  const [sending, setSending] = useState<Record<string, string>>({})

  // Form state
  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState<'meeting' | 'event'>('meeting')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [agenda, setAgenda] = useState('')
  const [recap, setRecap] = useState('')
  const [shifts, setShifts] = useState<Shift[]>([{ ...BLANK_SHIFT }])
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/meetings')
    const json = await res.json()
    setMeetings(json.meetings ?? [])
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setTitle(''); setMeetingType('meeting'); setDate(''); setTime(''); setEndTime('')
    setLocation(''); setDescription(''); setAgenda(''); setRecap('')
    setShifts([{ ...BLANK_SHIFT }])
    setShowForm(true)
  }

  function openEdit(m: Meeting) {
    setEditing(m)
    setTitle(m.title)
    setMeetingType(m.meeting_type ?? 'meeting')
    setDate(m.meeting_date)
    setTime(m.meeting_time)
    setEndTime(m.end_time ?? '')
    setLocation(m.location)
    setDescription(m.description ?? '')
    setAgenda(m.agenda_notes ?? '')
    setRecap(m.post_meeting_notes ?? '')
    setShifts(m.jwl_meeting_shifts?.length
      ? m.jwl_meeting_shifts.map(s => ({ id: s.id, label: s.label, start_time: s.start_time, end_time: s.end_time }))
      : [{ ...BLANK_SHIFT }])
    setShowForm(true)
  }

  async function save() {
    setSaving(true)
    const body = {
      title, meeting_date: date, meeting_time: time, end_time: endTime || null,
      location, agenda_notes: agenda || null, description: description || null,
      meeting_type: meetingType,
      post_meeting_notes: recap || null,
      shifts: meetingType === 'event' ? shifts : [],
    }
    if (editing) {
      await fetch('/api/admin/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...body }),
      })
    } else {
      await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  async function testEmail(meetingId: string) {
    setSending(s => ({ ...s, [meetingId + 'test']: 'sending' }))
    const res = await fetch('/api/admin/meetings/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: meetingId }),
    })
    const json = await res.json()
    setSending(s => ({ ...s, [meetingId + 'test']: json.ok ? `Sent to ${json.sent_to}` : 'Error' }))
  }

  function addShift() { setShifts(s => [...s, { ...BLANK_SHIFT }]) }
  function removeShift(i: number) { setShifts(s => s.filter((_, idx) => idx !== i)) }
  function setShift(i: number, f: keyof Shift, v: string) {
    setShifts(s => s.map((sh, idx) => idx === i ? { ...sh, [f]: v } : sh))
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">JWL Meetings &amp; Events</h1>
        <button onClick={openNew}
          className="bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0]">
          + New meeting / event
        </button>
      </div>

      {meetings.length === 0 && <p className="text-sm text-gray-400">No meetings yet.</p>}

      <div className="space-y-4">
        {meetings.map(m => {
          const isEvent = m.meeting_type === 'event'
          const yesCount = m.jwl_meeting_rsvps?.filter(r => r.response === 'yes').length ?? 0
          const noCount = m.jwl_meeting_rsvps?.filter(r => r.response === 'no').length ?? 0
          const shifts = (m.jwl_meeting_shifts ?? []).sort((a, b) => (a as any).sort_order - (b as any).sort_order)

          return (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[m.status]}`}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                      {isEvent ? 'Event' : 'Meeting'}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{m.title}</h2>
                  <p className="text-sm text-gray-500">
                    {fmtDate(m.meeting_date)} · {fmtTime(m.meeting_time)}{m.end_time ? ` – ${fmtTime(m.end_time)}` : ''} · {m.location}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {isEvent ? (
                    <div className="space-y-1">
                      {shifts.map(s => {
                        const names = (s.jwl_meeting_shift_signups ?? [])
                          .map(su => su.jwl_members?.name).filter(Boolean) as string[]
                        return (
                          <AttendeeCount key={s.id} label={s.label} names={names} />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <AttendeeCount
                        label="Attending"
                        names={m.jwl_meeting_rsvps.filter(r => r.response === 'yes').map(r => r.jwl_members?.name).filter(Boolean) as string[]}
                        decline={false}
                      />
                      {noCount > 0 && (
                        <AttendeeCount
                          label="Declined"
                          names={m.jwl_meeting_rsvps.filter(r => r.response === 'no').map(r => r.jwl_members?.name).filter(Boolean) as string[]}
                          decline
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {m.description && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3">{m.description}</p>
                </div>
              )}

              {/* Notification actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {m.status === 'draft' && (
                  <>
                    <NotifyBtn label="Publish & notify all" meetingId={m.id} type="published" sending={sending} onSend={notify} color="blue" />
                    <button onClick={() => testEmail(m.id)} disabled={!!sending[m.id + 'test']}
                      className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-60">
                      {sending[m.id + 'test'] ?? 'Send test to me'}
                    </button>
                  </>
                )}
                {m.status === 'published' && !isEvent && (
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
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit' : 'New'} meeting / event</h2>

            {/* Type toggle */}
            <div>
              <label className={labelCls}>Type</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
                {(['meeting', 'event'] as const).map(t => (
                  <button key={t} onClick={() => setMeetingType(t)}
                    className={`px-5 py-2 text-sm font-medium transition-colors ${meetingType === t ? 'bg-[#1B52C1] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              {meetingType === 'event' && (
                <p className="text-xs text-gray-400 mt-1">Events have multiple shifts — members sign up for the specific times they can help.</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder={meetingType === 'event' ? 'e.g. Backpacks for Success' : 'e.g. Monthly Membership Meeting'}
                className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                {meetingType === 'event' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Start time</label>
                      <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>End time</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Time</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. 62 Hollywood Place, Huntington, NY 11743" className={inputCls} />
            </div>

            {/* Description — drives the email body */}
            <div>
              <label className={labelCls}>
                Description / email body
                <span className="ml-1 text-gray-400 font-normal">(this text appears verbatim in the notification email)</span>
              </label>
              <textarea rows={10} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Write the full message that members will receive — greeting, details, what you need, sign-off…"
                className={inputCls + ' resize-y'} />
            </div>

            {/* Shifts — event only */}
            {meetingType === 'event' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelCls + ' mb-0'}>Shifts</label>
                  <button onClick={addShift} className="text-xs text-[#1B52C1] hover:underline">+ Add shift</button>
                </div>
                {shifts.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Label</label>
                      <input type="text" value={s.label} onChange={e => setShift(i, 'label', e.target.value)}
                        placeholder="e.g. Assembly" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Start</label>
                      <input type="time" value={s.start_time} onChange={e => setShift(i, 'start_time', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">End</label>
                      <input type="time" value={s.end_time} onChange={e => setShift(i, 'end_time', e.target.value)} className={inputCls} />
                    </div>
                    {shifts.length > 1 && (
                      <button onClick={() => removeShift(i)} className="text-gray-300 hover:text-red-500 pb-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Agenda notes (secondary, optional) */}
            <div>
              <label className={labelCls}>
                Agenda highlights <span className="text-gray-400 font-normal">(optional — shown in portal card)</span>
              </label>
              <textarea rows={2} value={agenda} onChange={e => setAgenda(e.target.value)}
                placeholder="Key topics or items…" className={inputCls} />
            </div>

            {editing && (
              <div>
                <label className={labelCls}>Post-meeting recap notes <span className="text-gray-400 font-normal">(after the meeting)</span></label>
                <textarea rows={4} value={recap} onChange={e => setRecap(e.target.value)}
                  placeholder="Meeting notes, decisions made, follow-up items…" className={inputCls} />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving || !title || !date || !time || !location}
                className="flex-1 bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
                {saving ? 'Saving…' : 'Save draft'}
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

function AttendeeCount({ label, names, decline }: { label: string; names: string[]; decline?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const count = names.length
  const textColor = decline ? 'text-gray-400' : 'text-gray-700'
  const countSize = decline ? 'text-xs' : 'text-sm font-medium'

  return (
    <div className="relative inline-block text-right" ref={ref}>
      <button
        onClick={() => count > 0 && setOpen(o => !o)}
        className={`${countSize} ${textColor} ${count > 0 ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
      >
        {label !== 'Attending' && label !== 'Declined' ? (
          <>{label}: <span className="font-medium text-gray-700">{count}</span> signed up</>
        ) : (
          <>{count} {label.toLowerCase()}</>
        )}
      </button>
      {open && count > 0 && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-[160px] max-w-[240px]">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pb-1">{label} ({count})</p>
          {names.sort().map(name => (
            <p key={name} className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">{name}</p>
          ))}
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
