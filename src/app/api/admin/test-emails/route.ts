// TEMPORARY — delete after testing
import { NextResponse } from 'next/server'
import {
  sendEmail,
  emailSWRegistrationReceived,
  emailSWRegistrationApproved,
  emailSWRegistrationRejected,
  emailSWFamilyRejected,
  emailSWFamilyAdjusted,
  emailAdminFamilyAdjusted,
  emailBroadcastSeasonOpen,
  emailBroadcastDeadlineReminder,
  emailSWSeasonReset,
  emailAdminSeasonReset,
  emailSocialWorkerSubmissionReceived,
} from '@/lib/email'

const TO = 'andrea@boccamktg.com'
const SW_NAME = 'Jane Smith'
const FAMILY_NAME = 'Rodriguez Family'
const FAMILY_REF = '#142'

export async function POST() {
  const results: { name: string; ok: boolean }[] = []

  async function send(name: string, payload: { subject: string; html: string }, opts?: { cc?: string }) {
    const result = await sendEmail({ to: TO, cc: opts?.cc, ...payload })
    results.push({ name, ok: result.success })
  }

  // §2.1 — SW registration received
  await send('2.1 SW registration received', emailSWRegistrationReceived(SW_NAME))

  // §2.2 — SW registration approved
  await send('2.2 SW registration approved', emailSWRegistrationApproved(SW_NAME))

  // §2.3 — SW registration rejected (no reason)
  await send('2.3 SW registration rejected (generic)', emailSWRegistrationRejected(SW_NAME))

  // §2.3 — SW registration rejected (with reason)
  await send('2.3 SW registration rejected (with reason)', emailSWRegistrationRejected(SW_NAME, 'We were unable to verify your affiliation with the listed school(s).'))

  // §2.4 — Family submission confirmation
  await send('2.4 Family submission received', emailSocialWorkerSubmissionReceived(SW_NAME, FAMILY_NAME, [
    { name: 'Maria Rodriguez', age: 7 },
    { name: 'Carlos Rodriguez', age: 10 },
  ]))

  // §2.5 — Family rejected (no reason)
  await send('2.5 Family rejected (generic)', emailSWFamilyRejected(SW_NAME, FAMILY_NAME))

  // §2.5 — Family rejected (with reason)
  await send('2.5 Family rejected (with reason)', emailSWFamilyRejected(SW_NAME, FAMILY_NAME, 'Family income exceeds program eligibility threshold.'))

  // §2.6 — SW adjustment email
  await send('2.6 Family adjusted (SW copy)', emailSWFamilyAdjusted(
    SW_NAME, FAMILY_NAME,
    ['Child added: Luis Rodriguez, age 5', 'Language preference updated from English to Spanish'],
    SW_NAME, 'Social Worker', FAMILY_REF,
  ))

  // §2.6 — Admin audit copy
  await send('2.6 Family adjusted (admin audit copy)', emailAdminFamilyAdjusted(
    FAMILY_NAME, SW_NAME, 'jsmith@school.org',
    ['Child removed: Maria Rodriguez, age 7'],
    SW_NAME, 'Social Worker', FAMILY_REF,
  ))

  // §3.1 — Season open broadcast
  await send('3.1 Season open broadcast', emailBroadcastSeasonOpen(SW_NAME))

  // §3.2 — Deadline reminder (has submissions)
  await send('3.2 Deadline reminder (has submissions)', emailBroadcastDeadlineReminder(SW_NAME, 'November 15, 2026', true))

  // §3.2 — Deadline reminder (no submissions)
  await send('3.2 Deadline reminder (no submissions)', emailBroadcastDeadlineReminder(SW_NAME, 'November 15, 2026', false))

  // §4 — SW season reset
  await send('4 Season reset (SW copy)', emailSWSeasonReset(SW_NAME))

  // §4 — Admin season reset confirmation
  await send('4 Season reset (admin copy)', emailAdminSeasonReset(47))

  return NextResponse.json({ results })
}
