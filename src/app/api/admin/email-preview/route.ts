import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import * as email from '@/lib/email'

const BASE = 'https://portal.jwlhuntington.org'

const FAKE = {
  name: 'Andrea Boccard',
  memberEmail: 'andrea@boccamktg.com',
  applicationId: 'abc-123',
  meetingDate: '2026-09-15',
  meetingTime: '6:30 PM',
  location: 'Huntington Library, 1151 Oxford Rd, San Marino, CA',
  shifts: [
    { label: 'Assembly', start_time: '08:00', end_time: '11:00' },
    { label: 'Transport', start_time: '11:00', end_time: '12:00' },
  ],
  allShiftCounts: [
    { label: 'Assembly', count: 7 },
    { label: 'Transport', count: 3 },
  ],
  attendees: ['Sarah Kim', 'Maria Gonzalez', 'Linda Park'],
  tokenUrl: `${BASE}/api/meetings/rsvp/fake-token?response=yes`,
  noUrl: `${BASE}/api/meetings/rsvp/fake-token?response=no`,
  eventTitle: 'Backpacks for Success 2026',
  grantType: 'Charitable Children Fund',
  swName: 'Jane Social',
  swEmail: 'jane@school.org',
}

function buildPayload(type: string): { subject: string; html: string } | null {
  switch (type) {
    // ── JWL Member emails ──────────────────────────────────────────────
    case 'meeting_published_meeting':
      return email.emailMeetingPublished(
        FAKE.name, FAKE.meetingDate, FAKE.meetingTime, FAKE.location, 'Monthly business meeting',
        FAKE.tokenUrl, FAKE.noUrl,
        { title: 'September Board Meeting', description: 'Please join us for our monthly update.', meetingType: 'meeting', shifts: [], portalUrl: `${BASE}/members/meetings` }
      )
    case 'meeting_published_event':
      return email.emailMeetingPublished(
        FAKE.name, FAKE.meetingDate, '8:00 AM', 'Pasadena Convention Center', null,
        FAKE.tokenUrl, FAKE.noUrl,
        {
          title: FAKE.eventTitle,
          description: 'Join us to assemble and distribute backpacks filled with school supplies for local children in need.\n\nPlease wear comfortable clothes and closed-toe shoes.\n\nReach out to Sarah Kim with any questions.',
          meetingType: 'event',
          shifts: [
            { ...FAKE.shifts[0], signupUrl: `${BASE}/api/meetings/shift-signup/fake-token-1` },
            { ...FAKE.shifts[1], signupUrl: `${BASE}/api/meetings/shift-signup/fake-token-2` },
          ],
          portalUrl: `${BASE}/members/meetings`,
        }
      )
    case 'meeting_rsvp_confirmation':
      return email.emailMeetingRsvpConfirmation(
        FAKE.name, 'September Board Meeting', FAKE.meetingDate,
        FAKE.meetingTime, FAKE.location, FAKE.attendees, FAKE.noUrl,
      )
    case 'event_shift_confirmation':
      return email.emailEventShiftConfirmation(
        FAKE.name, FAKE.eventTitle, FAKE.meetingDate, 'Pasadena Convention Center',
        FAKE.shifts, FAKE.allShiftCounts,
      )
    case 'meeting_reminder_7':
      return email.emailMeetingReminderFull(
        FAKE.name, 'September Board Meeting', FAKE.meetingDate,
        FAKE.meetingTime, FAKE.location, FAKE.attendees, 7,
        FAKE.tokenUrl, FAKE.noUrl,
      )
    case 'meeting_reminder_1':
      return email.emailMeetingReminderFull(
        FAKE.name, 'September Board Meeting', FAKE.meetingDate,
        FAKE.meetingTime, FAKE.location, FAKE.attendees, 1,
        FAKE.tokenUrl, FAKE.noUrl,
      )
    case 'event_reminder_7':
      return email.emailEventReminderFull(
        FAKE.name, FAKE.eventTitle, FAKE.meetingDate, 'Pasadena Convention Center',
        FAKE.shifts, FAKE.allShiftCounts, 7,
      )
    case 'event_reminder_1':
      return email.emailEventReminderFull(
        FAKE.name, FAKE.eventTitle, FAKE.meetingDate, 'Pasadena Convention Center',
        FAKE.shifts, FAKE.allShiftCounts, 1,
      )
    case 'meeting_recap':
      return email.emailMeetingRecap(FAKE.name, FAKE.meetingDate, 'We voted to proceed with the fall event. Next meeting is October 20. See you then!')
    case 'member_dues_reminder':
      return email.emailMemberDuesReminder(FAKE.name, 2026, 'Sarah Kim', 'https://membership-99939.cheddarup.com')
    // ── JWL Admin emails ───────────────────────────────────────────────
    case 'admin_new_member':
      return email.emailAdminNewMember(FAKE.name, FAKE.memberEmail, `${BASE}/admin/members`)
    case 'admin_new_social_worker':
      return email.emailAdminNewSocialWorker(FAKE.swName, FAKE.swEmail, 'Roosevelt Elementary, Lincoln Middle', `${BASE}/admin/social-workers`)
    case 'admin_new_grant':
      return email.emailAdminNewGrant(FAKE.swName, FAKE.swEmail, FAKE.grantType, 1000)
    case 'admin_grant_activity_message':
      return email.emailAdminGrantActivity(FAKE.swName, FAKE.applicationId, 'message', 'Can you clarify the household income?')
    case 'admin_grant_activity_document':
      return email.emailAdminGrantActivity(FAKE.swName, FAKE.applicationId, 'document', 'utility_bill.pdf')
    case 'admin_children_requested':
      return email.emailAdminChildrenRequested(FAKE.name, 'Requested 2 children (ages 4 and 7); removed 1 child (age 12)')
    case 'admin_season_reset':
      return email.emailAdminSeasonReset(47)
    // ── Social Worker / Grants emails ──────────────────────────────────
    case 'sw_registration_received':
      return email.emailSWRegistrationReceived(FAKE.swName)
    case 'sw_registration_approved':
      return email.emailSWRegistrationApproved(FAKE.swName)
    case 'sw_registration_rejected':
      return email.emailSWRegistrationRejected(FAKE.swName, 'We were unable to verify your license at this time.')
    case 'sw_submission_received':
      return email.emailSocialWorkerSubmissionReceived(FAKE.swName, 'The Rodriguez Family', [{ name: 'Emma Rodriguez', age: 5 }, { name: 'Liam Rodriguez', age: 8 }])
    case 'sw_grant_status_approved':
      return email.emailSocialWorkerGrantStatusUpdate(FAKE.swName, FAKE.applicationId, 'approved', 750)
    case 'sw_grant_status_denied':
      return email.emailSocialWorkerGrantStatusUpdate(FAKE.swName, FAKE.applicationId, 'denied', undefined, 'Funding exhausted for this cycle.')
    case 'sw_grant_activity_message':
      return email.emailSocialWorkerGrantActivity(FAKE.swName, FAKE.applicationId, 'message', 'We need a copy of the utility bill.')
    case 'sw_family_rejected':
      return email.emailSWFamilyRejected(FAKE.swName, 'The Rodriguez Family', 'The child does not meet the age eligibility requirement.')
    case 'sw_broadcast_season_open':
      return email.emailBroadcastSeasonOpen(FAKE.swName)
    case 'sw_broadcast_deadline_reminder':
      return email.emailBroadcastDeadlineReminder(FAKE.swName, 'November 15, 2026', true)
    case 'sw_season_reset':
      return email.emailSWSeasonReset(FAKE.swName)
    // ── Grant member vote ──────────────────────────────────────────────
    case 'grant_member_vote':
      return email.emailGrantMemberVote(
        FAKE.name, 'A family of 4 is requesting $750 for a utility shutoff. The primary earner recently lost their job.',
        `${BASE}/grants/vote/fake?v=yes`, `${BASE}/grants/vote/fake?v=no`, `${BASE}/grants/vote/fake?v=more_info`,
      )
    case 'grant_vote_confirmation_yes':
      return email.emailGrantVoteConfirmation(FAKE.name, 'yes')
    case 'grant_vote_confirmation_no':
      return email.emailGrantVoteConfirmation(FAKE.name, 'no')
    case 'grants_portal_invite':
      return email.emailGrantsPortalInvite('Sarah Kim', FAKE.name, FAKE.applicationId)
    // ── JJWL Member emails ─────────────────────────────────────────────
    case 'jjwl_registration_submitted':
      return email.emailRegistrationSubmitted(FAKE.name)
    case 'jjwl_registration_approved':
      return email.emailRegistrationApproved(FAKE.name, `${BASE}/members/dues`)
    case 'jjwl_registration_rejected':
      return email.emailRegistrationRejected(FAKE.name)
    case 'jjwl_event_published':
      return email.emailEventPublished(FAKE.name, FAKE.eventTitle, 'September 15, 2026', '8:00 AM', '12:00 PM', 'Pasadena Convention Center', 4, 'Help us sort and pack backpacks for local kids.', 20)
    case 'jjwl_event_signup':
      return email.emailEventSignupConfirmation(FAKE.name, FAKE.eventTitle, 'September 15, 2026', '8:00 AM', '12:00 PM', 'Pasadena Convention Center', 'Assembly (8–11am)', 4)
    case 'jjwl_event_reminder_7':
      return email.emailMemberEventReminder(FAKE.name, FAKE.eventTitle, 'September 15, 2026', '8:00', '12:00', 'Pasadena Convention Center', 'Assembly (8–11am)', 7)
    case 'jjwl_event_reminder_2':
      return email.emailMemberEventReminder(FAKE.name, FAKE.eventTitle, 'September 15, 2026', '8:00', '12:00', 'Pasadena Convention Center', 'Assembly (8–11am)', 2)
    case 'jjwl_event_cancelled':
      return email.emailEventCancelledToSignup(FAKE.name, FAKE.eventTitle, 'September 15, 2026')
    case 'jjwl_hours_confirmed':
      return email.emailHoursConfirmed(FAKE.name, FAKE.eventTitle, 4)
    case 'jjwl_dues_paid':
      return email.emailDuesPaid(FAKE.name)
    case 'jjwl_waiver_confirmed':
      return email.emailWaiverConfirmed(FAKE.name, '2025–2026')
    case 'jjwl_year_end_certificate':
      return email.emailYearEndCertificate(FAKE.name, 12, '2025–2026')
    case 'member_children_assigned':
      return email.emailMemberChildrenAssigned(FAKE.name, 2, 'Added: Emma (age 5), Liam (age 8)')
    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  const actor = await requireAdminFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { type, action, subject: customSubject, html: customHtml } = body

  if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

  // action=preview: return the payload without sending
  if (action === 'preview') {
    const payload = buildPayload(type)
    if (!payload) return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    return NextResponse.json({ subject: payload.subject, html: payload.html })
  }

  const srv = await serverClient()
  const { data: { user } } = await srv.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'No user email' }, { status: 400 })

  // Use custom html/subject if provided (edited version), else generate from type
  let subject = customSubject as string | undefined
  let html = customHtml as string | undefined

  if (!html || !subject) {
    const payload = buildPayload(type)
    if (!payload) return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    subject = subject ?? payload.subject
    html = html ?? payload.html
  }

  const result = await sendEmail({
    to: user.email,
    subject: `[PREVIEW] ${subject}`,
    html,
  })

  return NextResponse.json({ ok: result.success, sent_to: user.email, error: result.error })
}
