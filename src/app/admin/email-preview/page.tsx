'use client'

import { useState } from 'react'

const GROUPS = [
  {
    label: 'JWL Member — Meetings & Events',
    templates: [
      { type: 'meeting_published_meeting', label: 'Meeting published (meeting)' },
      { type: 'meeting_published_event', label: 'Meeting published (event with shifts)' },
      { type: 'meeting_rsvp_confirmation', label: 'RSVP confirmation (meeting yes)' },
      { type: 'event_shift_confirmation', label: 'Shift signup confirmation (event)' },
      { type: 'meeting_reminder_7', label: 'Meeting reminder — 7 days out' },
      { type: 'meeting_reminder_1', label: 'Meeting reminder — 1 day out' },
      { type: 'event_reminder_7', label: 'Event reminder — 7 days out' },
      { type: 'event_reminder_1', label: 'Event reminder — 1 day out' },
      { type: 'meeting_recap', label: 'Meeting recap' },
    ],
  },
  {
    label: 'JWL Member — Membership',
    templates: [
      { type: 'member_dues_reminder', label: 'Dues reminder' },
      { type: 'member_children_assigned', label: 'Children assigned' },
    ],
  },
  {
    label: 'JWL Admin',
    templates: [
      { type: 'admin_new_member', label: 'New member registration' },
      { type: 'admin_new_social_worker', label: 'New social worker' },
      { type: 'admin_new_grant', label: 'New grant application' },
      { type: 'admin_grant_activity_message', label: 'Grant — new message' },
      { type: 'admin_grant_activity_document', label: 'Grant — new document' },
      { type: 'admin_children_requested', label: 'Children change requested' },
      { type: 'admin_season_reset', label: 'Season reset summary' },
    ],
  },
  {
    label: 'Social Worker / Grants',
    templates: [
      { type: 'sw_registration_received', label: 'SW registration received' },
      { type: 'sw_registration_approved', label: 'SW registration approved' },
      { type: 'sw_registration_rejected', label: 'SW registration rejected' },
      { type: 'sw_submission_received', label: 'Grant submission received' },
      { type: 'sw_grant_status_approved', label: 'Grant approved' },
      { type: 'sw_grant_status_denied', label: 'Grant denied' },
      { type: 'sw_grant_activity_message', label: 'Grant — message from admin' },
      { type: 'sw_family_rejected', label: 'Family submission rejected' },
      { type: 'sw_broadcast_season_open', label: 'Season open broadcast' },
      { type: 'sw_broadcast_deadline_reminder', label: 'Deadline reminder broadcast' },
      { type: 'sw_season_reset', label: 'Season reset' },
    ],
  },
  {
    label: 'Grant Member Vote',
    templates: [
      { type: 'grant_member_vote', label: 'Vote request' },
      { type: 'grant_vote_confirmation_yes', label: 'Vote confirmation — yes' },
      { type: 'grant_vote_confirmation_no', label: 'Vote confirmation — no' },
      { type: 'grants_portal_invite', label: 'Grants portal invite' },
    ],
  },
  {
    label: 'JJWL Member',
    templates: [
      { type: 'jjwl_registration_submitted', label: 'Registration submitted' },
      { type: 'jjwl_registration_approved', label: 'Registration approved' },
      { type: 'jjwl_registration_rejected', label: 'Registration rejected' },
      { type: 'jjwl_event_published', label: 'Event published' },
      { type: 'jjwl_event_signup', label: 'Event signup confirmation' },
      { type: 'jjwl_event_reminder_7', label: 'Event reminder — 7 days out' },
      { type: 'jjwl_event_reminder_2', label: 'Event reminder — 2 days out' },
      { type: 'jjwl_event_cancelled', label: 'Event cancelled' },
      { type: 'jjwl_hours_confirmed', label: 'Hours confirmed' },
      { type: 'jjwl_dues_paid', label: 'Dues paid' },
      { type: 'jjwl_waiver_confirmed', label: 'Waiver confirmed' },
      { type: 'jjwl_year_end_certificate', label: 'Year-end certificate' },
    ],
  },
]

function SendButton({ type, label }: { type: string; label: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function send() {
    setState('sending')
    const res = await fetch('/api/admin/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    setState(res.ok ? 'sent' : 'error')
    if (res.ok) setTimeout(() => setState('idle'), 3000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
      <button
        onClick={send}
        disabled={state === 'sending'}
        style={{
          fontSize: 13,
          padding: '5px 14px',
          borderRadius: 6,
          border: 'none',
          cursor: state === 'sending' ? 'default' : 'pointer',
          background: state === 'sent' ? '#16a34a' : state === 'error' ? '#dc2626' : '#1B52C1',
          color: 'white',
          fontWeight: 600,
          minWidth: 100,
          transition: 'background 0.2s',
        }}
      >
        {state === 'sending' ? 'Sending…' : state === 'sent' ? '✓ Sent' : state === 'error' ? 'Error' : 'Send to me'}
      </button>
    </div>
  )
}

export default function EmailPreviewPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Email Preview</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 36 }}>
        Send any template to your email with sample data. Emails arrive with a <strong>[PREVIEW]</strong> subject prefix.
      </p>

      {GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>
            {group.label}
          </div>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 16px' }}>
            {group.templates.map(t => (
              <SendButton key={t.type} type={t.type} label={t.label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
