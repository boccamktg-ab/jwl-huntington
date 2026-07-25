'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const REGISTER_URL = 'https://portal.jwlhuntington.org/jjwl/register'

type Event = {
  id: string
  title: string
  location: string
  event_date: string
  start_time: string
  end_time: string | null
  credit_hours: number
  description: string | null
  volunteer_slots_total: number
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''} ${ampm}`
}

export default function EmbedPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Event | null>(null)

  useEffect(() => {
    fetch('/api/jjwl/public-events')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f9fafb', minHeight: '100vh', padding: '24px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Image src="/jwl-logo.png" alt="JWL" width={40} height={40} style={{ borderRadius: '50%', background: 'white', padding: 3, border: '1px solid #e5e7eb' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>Junior Junior Welfare League</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Upcoming Events</div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>Loading events…</div>
      )}

      {!loading && events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>
          No upcoming events right now. Check back soon!
        </div>
      )}

      {/* Event grid */}
      {!loading && events.length > 0 && !selected && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {events.map(evt => (
            <button
              key={evt.id}
              onClick={() => setSelected(evt)}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(27,82,193,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
            >
              {/* Date badge */}
              <div style={{ display: 'inline-block', background: '#1B52C1', color: 'white', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 6 }}>{evt.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>📍 {evt.location}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                🕐 {formatTime(evt.start_time)}{evt.end_time ? ` – ${formatTime(evt.end_time)}` : ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#1B52C1', fontWeight: 500 }}>{evt.credit_hours} credit hour{evt.credit_hours !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>View details →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Event detail */}
      {selected && (
        <div>
          <button
            onClick={() => setSelected(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B52C1', fontSize: 14, marginBottom: 20, padding: 0 }}
          >
            ← Back to events
          </button>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'inline-block', background: '#1B52C1', color: 'white', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
              {formatDate(selected.event_date)}
            </div>
            <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#111827' }}>{selected.title}</h2>
            <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              <Detail icon="📍" label="Location" value={selected.location} />
              <Detail icon="🕐" label="Time" value={`${formatTime(selected.start_time)}${selected.end_time ? ` – ${formatTime(selected.end_time)}` : ''}`} />
              <Detail icon="⭐" label="Credit hours" value={`${selected.credit_hours} hour${selected.credit_hours !== 1 ? 's' : ''}`} />
              {selected.volunteer_slots_total > 0 && (
                <Detail icon="👥" label="Volunteer spots" value={String(selected.volunteer_slots_total)} />
              )}
            </div>
            {selected.description && (
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 24, padding: '16px', background: '#f9fafb', borderRadius: 8 }}>
                {selected.description}
              </p>
            )}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                Want to participate in this event and earn community service hours? Join the JJWL program to get access to all upcoming events.
              </p>
              <a
                href={REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#1B52C1',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Join JJWL to participate →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA when viewing list */}
      {!loading && events.length > 0 && !selected && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            JJWL members earn community service hours by participating in these events.
          </p>
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#1B52C1',
              color: 'white',
              textDecoration: 'none',
              padding: '12px 28px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Join JJWL →
          </a>
        </div>
      )}
      </div>
    </div>
  )
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#9ca3af', minWidth: 90 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
