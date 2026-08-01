'use client'

import { useState, useRef, useEffect } from 'react'

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
      { type: 'member_children_assigned', label: 'Children assigned' },
    ],
  },
]

type EditPanelState = {
  type: string
  subject: string
  html: string
  loading: boolean
  tab: 'preview' | 'code'
  sendState: 'idle' | 'sending' | 'sent' | 'error'
}

function TemplateRow({ type, label }: { type: string; label: string }) {
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [panel, setPanel] = useState<EditPanelState | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Sync iframe srcdoc whenever html changes
  useEffect(() => {
    if (!iframeRef.current || !panel) return
    const doc = iframeRef.current.contentDocument
    if (doc) {
      doc.open()
      doc.write(panel.html)
      doc.close()
    }
  }, [panel?.html, panel?.tab])

  async function quickSend() {
    setSendState('sending')
    const res = await fetch('/api/admin/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    setSendState(res.ok ? 'sent' : 'error')
    if (res.ok) setTimeout(() => setSendState('idle'), 3000)
  }

  async function openEdit() {
    if (panel) { setPanel(null); return }
    setPanel({ type, subject: '', html: '', loading: true, tab: 'preview', sendState: 'idle' })
    const res = await fetch('/api/admin/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action: 'preview' }),
    })
    const data = await res.json()
    setPanel(p => p ? { ...p, subject: data.subject ?? '', html: data.html ?? '', loading: false } : null)
  }

  async function sendEdited() {
    if (!panel) return
    setPanel(p => p ? { ...p, sendState: 'sending' } : null)
    const res = await fetch('/api/admin/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, subject: panel.subject, html: panel.html }),
    })
    const next = res.ok ? 'sent' : 'error'
    setPanel(p => p ? { ...p, sendState: next } : null)
    if (res.ok) setTimeout(() => setPanel(p => p ? { ...p, sendState: 'idle' } : null), 3000)
  }

  const btnBase: React.CSSProperties = {
    fontSize: 13, padding: '5px 14px', borderRadius: 6, border: 'none',
    cursor: 'pointer', color: 'white', fontWeight: 600, transition: 'background 0.15s',
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: panel ? 'none' : '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={openEdit} style={{ ...btnBase, background: panel ? '#374151' : '#6b7280', minWidth: 90 }}>
            {panel ? 'Close' : 'Edit & Send'}
          </button>
          <button
            onClick={quickSend}
            disabled={sendState === 'sending'}
            style={{
              ...btnBase,
              background: sendState === 'sent' ? '#16a34a' : sendState === 'error' ? '#dc2626' : '#1B52C1',
              minWidth: 100,
            }}
          >
            {sendState === 'sending' ? 'Sending…' : sendState === 'sent' ? '✓ Sent' : sendState === 'error' ? 'Error' : 'Send to me'}
          </button>
        </div>
      </div>

      {panel && (
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 4 }}>
          {panel.loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading template…</div>
          ) : (
            <>
              {/* Subject line */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Subject</label>
                <input
                  value={panel.subject}
                  onChange={e => setPanel(p => p ? { ...p, subject: e.target.value } : null)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                {(['preview', 'code'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPanel(p => p ? { ...p, tab } : null)}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 5, border: 'none',
                      cursor: 'pointer', background: panel.tab === tab ? '#1B52C1' : '#f1f5f9',
                      color: panel.tab === tab ? 'white' : '#6b7280',
                    }}
                  >
                    {tab === 'preview' ? 'Preview' : 'HTML'}
                  </button>
                ))}
              </div>

              {/* Preview / Code pane */}
              {panel.tab === 'preview' ? (
                <iframe
                  ref={iframeRef}
                  style={{ width: '100%', height: 480, border: '1px solid #e5e7eb', borderRadius: 8, background: 'white' }}
                  title="email preview"
                />
              ) : (
                <textarea
                  value={panel.html}
                  onChange={e => setPanel(p => p ? { ...p, html: e.target.value } : null)}
                  spellCheck={false}
                  style={{
                    width: '100%', height: 480, padding: '10px 12px', border: '1px solid #e5e7eb',
                    borderRadius: 8, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6,
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              )}

              {/* Send edited */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  onClick={sendEdited}
                  disabled={panel.sendState === 'sending'}
                  style={{
                    ...btnBase,
                    background: panel.sendState === 'sent' ? '#16a34a' : panel.sendState === 'error' ? '#dc2626' : '#1B52C1',
                    padding: '8px 20px',
                  }}
                >
                  {panel.sendState === 'sending' ? 'Sending…' : panel.sendState === 'sent' ? '✓ Sent' : panel.sendState === 'error' ? 'Error' : 'Send edited version to me'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default function EmailPreviewPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Email Preview</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 36 }}>
        Send any template to your email with sample data. Use <strong>Edit &amp; Send</strong> to tweak content before sending. All emails arrive with a <strong>[PREVIEW]</strong> subject prefix.
      </p>

      {GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>
            {group.label}
          </div>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 16px' }}>
            {group.templates.map(t => (
              <TemplateRow key={t.type} type={t.type} label={t.label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
