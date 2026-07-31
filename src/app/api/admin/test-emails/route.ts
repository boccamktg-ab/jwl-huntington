import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail,
  emailAdminNewGrant,
  emailAdminGrantActivity,
  emailSocialWorkerGrantActivity,
  emailSocialWorkerGrantStatusUpdate,
  emailSWRegistrationReceived,
  emailSWRegistrationApproved,
  emailSWRegistrationRejected,
  emailGrantMemberVote,
  emailGrantMoreInfoReceived,
  emailGrantVoteConfirmation,
} from '@/lib/email'

const FAKE_APP_ID = '00000000-0000-0000-0000-000000000001'
const FAKE_TOKEN = 'preview-token-123'
const BASE = 'https://portal.jwlhuntington.org'

const EMAILS: { label: string; build: () => { subject: string; html: string } }[] = [
  {
    label: '1. Admin — New grant submitted (Charitable Children)',
    build: () => emailAdminNewGrant('Maria Santos', 'maria@agency.org', 'charitable_children', 750),
  },
  {
    label: '2. Admin — New grant submitted (Lift Fund)',
    build: () => emailAdminNewGrant('Maria Santos', 'maria@agency.org', 'lift_fund', 2500),
  },
  {
    label: '3. Admin — SW sent a message on a grant',
    build: () => emailAdminGrantActivity('Maria Santos', FAKE_APP_ID, 'message', 'Can you clarify the timeline for this decision?'),
  },
  {
    label: '4. Admin — SW uploaded a document on a grant',
    build: () => emailAdminGrantActivity('Maria Santos', FAKE_APP_ID, 'document', 'utility_bill_march.pdf'),
  },
  {
    label: '5. Social Worker — Reviewer sent a message',
    build: () => emailSocialWorkerGrantActivity('Maria Santos', FAKE_APP_ID, 'message', 'We need the most recent bank statement to complete our review.'),
  },
  {
    label: '6. Social Worker — Reviewer uploaded a document',
    build: () => emailSocialWorkerGrantActivity('Maria Santos', FAKE_APP_ID, 'document', 'approval_letter.pdf'),
  },
  {
    label: '7. Social Worker — Application approved',
    build: () => emailSocialWorkerGrantStatusUpdate('Maria Santos', FAKE_APP_ID, 'approved', 750),
  },
  {
    label: '8. Social Worker — Application denied',
    build: () => emailSocialWorkerGrantStatusUpdate('Maria Santos', FAKE_APP_ID, 'denied', undefined, 'The applicant does not meet the Town of Huntington residency requirement.'),
  },
  {
    label: '9. Social Worker — More information requested',
    build: () => emailSocialWorkerGrantStatusUpdate('Maria Santos', FAKE_APP_ID, 'needs_more_info'),
  },
  {
    label: '10. Social Worker — Paid and closed',
    build: () => emailSocialWorkerGrantStatusUpdate('Maria Santos', FAKE_APP_ID, 'paid_closed', 750),
  },
  {
    label: '11. Social Worker — Registration received',
    build: () => emailSWRegistrationReceived('Maria Santos'),
  },
  {
    label: '12. Social Worker — Registration approved',
    build: () => emailSWRegistrationApproved('Maria Santos'),
  },
  {
    label: '13. Social Worker — Registration rejected',
    build: () => emailSWRegistrationRejected('Maria Santos', 'We were unable to verify your affiliation with a Huntington-area organization.'),
  },
  {
    label: '14. Member — Vote requested',
    build: () => emailGrantMemberVote(
      'Jennifer Walsh',
      'A family of four is requesting $2,500 from the Lift Fund to cover two months of overdue rent following an unexpected medical event. The primary earner has returned to work and the family has a plan for ongoing expenses.',
      `${BASE}/api/grants/vote/${FAKE_TOKEN}?v=yes`,
      `${BASE}/api/grants/vote/${FAKE_TOKEN}?v=no`,
      `${BASE}/vote/${FAKE_TOKEN}`,
    ),
  },
  {
    label: '15. Admin — Member requested more information (vote paused)',
    build: () => emailGrantMoreInfoReceived(
      'Andrea',
      'Jennifer Walsh',
      'Can you clarify whether this family has received any prior assistance from JWL, and if so when?',
      FAKE_APP_ID,
    ),
  },
  {
    label: '16. Member — Vote confirmation (Approve)',
    build: () => emailGrantVoteConfirmation('Jennifer Walsh', 'yes'),
  },
  {
    label: '17. Member — Vote confirmation (Deny)',
    build: () => emailGrantVoteConfirmation('Jennifer Walsh', 'no'),
  },
  {
    label: '18. Member — Vote confirmation (More Info)',
    build: () => emailGrantVoteConfirmation('Jennifer Walsh', 'more_info'),
  },
]

export async function POST(request: NextRequest) {
  const actor = await requireAdminFromRequest(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const to = actor.email!
  const results: { label: string; ok: boolean; error?: string }[] = []

  for (const e of EMAILS) {
    const { subject, html } = e.build()
    const { success, error } = await sendEmail({ to, subject: `[PREVIEW] ${subject}`, html })
    results.push({ label: e.label, ok: success, error })
  }

  const failed = results.filter(r => !r.ok)
  return NextResponse.json({ sent: results.length - failed.length, failed: failed.length, results })
}
