import { Resend } from 'resend'

const FROM = 'JWL Huntington <noreply@portal.jwlhuntington.org>'

export type EmailPayload = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html })
    return { success: true }
  } catch (err: any) {
    console.error('[email] send error', err)
    return { success: false, error: err.message }
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

export function emailRegistrationSubmitted(name: string) {
  return {
    subject: 'JJWL Registration Received',
    html: `<p>Hi ${name},</p>
<p>Thank you for registering for the Junior Junior Welfare League of Huntington! We have received your application and an administrator will review it shortly.</p>
<p>You will receive an email once your registration has been reviewed.</p>
<p>— Junior Welfare League of Huntington</p>`,
  }
}

export function emailRegistrationApproved(name: string, cheddarUpUrl: string) {
  const payLink = cheddarUpUrl
    ? `<p>To complete your membership, please pay your dues here: <a href="${cheddarUpUrl}">${cheddarUpUrl}</a></p>`
    : ''
  return {
    subject: 'Your JJWL Registration Has Been Approved!',
    html: `<p>Hi ${name},</p>
<p>Great news — your JJWL registration has been approved!</p>
${payLink}
<p>Once your payment is confirmed, your account will be fully activated and you'll be able to browse and sign up for events.</p>
<p>— Junior Welfare League of Huntington</p>`,
  }
}

export function emailHoursConfirmed(name: string, eventTitle: string, hours: number) {
  return {
    subject: `Hours Confirmed: ${eventTitle}`,
    html: `<p>Hi ${name},</p>
<p>Your attendance at <strong>${eventTitle}</strong> has been confirmed and <strong>${hours} credit hour${hours !== 1 ? 's' : ''}</strong> ${hours !== 1 ? 'have' : 'has'} been added to your account.</p>
<p>Log in to view your updated hour total and participation history.</p>
<p>— Junior Welfare League of Huntington</p>`,
  }
}

export function emailEventReminder(name: string, eventTitle: string, date: string, location: string) {
  return {
    subject: `Reminder: ${eventTitle} is next week`,
    html: `<p>Hi ${name},</p>
<p>This is a reminder that you are signed up for <strong>${eventTitle}</strong>.</p>
<ul>
  <li><strong>Date:</strong> ${date}</li>
  <li><strong>Location:</strong> ${location}</li>
</ul>
<p>We look forward to seeing you there!</p>
<p>— Junior Welfare League of Huntington</p>`,
  }
}

export function emailAdminNewRegistration(memberName: string, adminPortalUrl: string) {
  return {
    subject: 'New JJWL Registration Submitted',
    html: `<p>A new JJWL member registration has been submitted by <strong>${memberName}</strong> and is awaiting your review.</p>
<p><a href="${adminPortalUrl}">Review in the admin portal →</a></p>`,
  }
}
