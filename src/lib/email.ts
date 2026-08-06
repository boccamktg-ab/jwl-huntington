import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const FROM = 'JWL Huntington <noreply@jwlhuntington.org>'

export type EmailPayload = {
  to: string | string[]
  cc?: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, cc, subject, html }: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      ...(cc ? { cc: Array.isArray(cc) ? cc : [cc] } : {}),
      subject,
      html,
    })
    return { success: true }
  } catch (err: any) {
    console.error('[email] send error', err)
    return { success: false, error: err.message }
  }
}

// Returns all emails that should receive JJWL admin notifications
export async function getJjwlAdminEmails(): Promise<string[]> {
  const emails: string[] = []

  // Super admin
  if (process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    emails.push(process.env.NEXT_PUBLIC_ADMIN_EMAIL)
  }

  // JWL members with is_jjwl_admin
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await db
    .from('jwl_members')
    .select('email')
    .or('is_jjwl_admin.eq.true,is_super_admin.eq.true')
    .eq('status', 'approved')

  for (const m of data ?? []) {
    if (m.email && !emails.includes(m.email)) emails.push(m.email)
  }

  return emails
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function header() {
  return `
    <div style="background:#1B52C1;padding:20px 32px;border-radius:8px 8px 0 0;">
      <p style="margin:0;color:white;font-size:16px;font-weight:600;font-family:sans-serif;">
        Junior Welfare League of Huntington
      </p>
    </div>
  `
}

function footer() {
  return `
    <div style="padding:20px 32px;border-top:1px solid #e5e7eb;margin-top:32px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif;">
        Junior Welfare League of Huntington · <a href="https://portal.jwlhuntington.org" style="color:#1B52C1;">portal.jwlhuntington.org</a>
      </p>
    </div>
  `
}

function wrap(body: string) {
  return `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#111827;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      ${header()}
      <div style="padding:28px 32px;">
        ${body}
      </div>
      ${footer()}
    </div>
  `
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${text}</p>`
}

function btn(label: string, url: string) {
  return `
    <a href="${url}" style="display:inline-block;background:#1B52C1;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 16px;">
      ${label}
    </a>
  `
}

function infoBox(rows: { label: string; value: string }[]) {
  const inner = rows.map(r => `
    <tr>
      <td style="padding:8px 12px;font-size:14px;color:#6b7280;width:140px;white-space:nowrap;">${r.label}</td>
      <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:500;">${r.value}</td>
    </tr>
  `).join('')
  return `
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;margin:16px 0;" cellpadding="0" cellspacing="0">
      <tbody>${inner}</tbody>
    </table>
  `
}

// ─── Member emails ────────────────────────────────────────────────────────────

export function emailRegistrationSubmitted(name: string) {
  return {
    subject: 'JJWL — We received your registration!',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${name.split(' ')[0]},</h2>
      ${p("Thank you for applying to the Junior Junior Welfare League of Huntington! We've received your registration and it's currently under review.")}
      ${p("You'll receive another email once your application has been approved. If you have any questions in the meantime, please reach out to us at <a href='mailto:info@jwlhuntington.org' style='color:#1B52C1;'>info@jwlhuntington.org</a>.")}
      ${p("We're excited to have you join us!")}
    `),
  }
}

export function emailRegistrationApproved(name: string, cheddarUpUrl: string) {
  return {
    subject: 'JJWL — Your registration has been approved!',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Congratulations, ${name.split(' ')[0]}!</h2>
      ${p("Great news — your JJWL registration has been approved! You're almost ready to start participating in events and earning volunteer hours.")}
      <h3 style="margin:20px 0 8px;font-size:16px;font-weight:600;color:#111827;">Complete your membership</h3>
      ${p("To get fully set up, please complete both steps below:")}
      ${p("<strong>Step 1 — Pay membership dues</strong>")}
      ${cheddarUpUrl ? btn('Pay Membership Dues →', cheddarUpUrl) : p("<strong>Payment link:</strong> Please contact <a href='mailto:info@jwlhuntington.org' style='color:#1B52C1;'>info@jwlhuntington.org</a> for your payment link.")}
      ${p("<strong>Step 2 — Complete your parent/guardian waiver</strong><br>Once your payment is confirmed and your account is activated, log in to complete the waiver. You'll need to do this before signing up for events.")}
      ${btn('Complete Waiver →', 'https://portal.jwlhuntington.org/jjwl/waiver')}
      ${p("After both steps are done, you're all set to browse and sign up for events.")}
    `),
  }
}

export function emailEventSignupConfirmation(
  name: string,
  eventTitle: string,
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
  location: string,
  timeSlot: string | null,
  creditHours: number,
) {
  const rows = [
    { label: 'Event', value: eventTitle },
    { label: 'Date', value: eventDate },
    ...(startTime ? [{ label: 'Time', value: startTime + (endTime ? ` – ${endTime}` : '') }] : []),
    { label: 'Location', value: location },
    ...(timeSlot ? [{ label: 'Your slot', value: timeSlot }] : []),
    { label: 'Credit hours', value: `${creditHours} hr${creditHours !== 1 ? 's' : ''}` },
  ]
  return {
    subject: `JJWL — You're signed up for ${eventTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">You're in, ${name.split(' ')[0]}!</h2>
      ${p(`Your signup for <strong>${eventTitle}</strong> has been confirmed. Here are your event details:`)}
      ${infoBox(rows)}
      ${p("Need to cancel? You can manage your signups at any time by logging into your account.")}
      ${btn('View my events →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

export function emailMemberEventReminder(
  name: string,
  eventTitle: string,
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
  location: string,
  timeSlot: string | null,
  daysOut: number,
) {
  const when = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`
  const rows = [
    { label: 'Event', value: eventTitle },
    { label: 'Date', value: eventDate },
    ...(startTime ? [{ label: 'Time', value: startTime + (endTime ? ` – ${endTime}` : '') }] : []),
    { label: 'Location', value: location },
    ...(timeSlot ? [{ label: 'Your slot', value: timeSlot }] : []),
  ]
  return {
    subject: `JJWL Reminder — ${eventTitle} is ${when}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">See you ${when}, ${name.split(' ')[0]}!</h2>
      ${p(`This is a reminder that you're signed up for <strong>${eventTitle}</strong>, coming up ${when}.`)}
      ${infoBox(rows)}
      ${p("We look forward to seeing you there! If you need to cancel, please do so as soon as possible.")}
      ${btn('View my events →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

export function emailHoursConfirmed(name: string, eventTitle: string, hours: number) {
  return {
    subject: `JJWL — ${hours} hour${hours !== 1 ? 's' : ''} confirmed for ${eventTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hours confirmed!</h2>
      ${p(`Your attendance at <strong>${eventTitle}</strong> has been confirmed and <strong>${hours} credit hour${hours !== 1 ? 's have' : ' has'} been added</strong> to your account.`)}
      ${btn('View my hours →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

export function emailRegistrationRejected(name: string) {
  return {
    subject: 'JJWL — Update on your registration',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${name.split(' ')[0]},</h2>
      ${p("Thank you for your interest in the Junior Junior Welfare League of Huntington. After reviewing your application, we are unable to approve your registration at this time.")}
      ${p("If you have questions or would like more information, please contact us at <a href='mailto:jbrady8116@gmail.com' style='color:#1B52C1;'>jbrady8116@gmail.com</a> or 646-314-1564.")}
    `),
  }
}

export function emailDuesPaid(name: string) {
  return {
    subject: 'JJWL — Payment received, account activated!',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">You're all set, ${name.split(' ')[0]}!</h2>
      ${p("Your membership payment has been received and your JJWL account is now active.")}
      ${p("Before signing up for events, make sure you've completed your parent/guardian waiver — it's required and only takes a few minutes.")}
      ${btn('Complete waiver →', 'https://portal.jwlhuntington.org/jjwl/waiver')}
      ${p("Once your waiver is on file, you can browse and sign up for upcoming events.")}
      ${btn('View upcoming events →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

export function emailWaiverConfirmed(name: string, season: string) {
  return {
    subject: `JJWL — Waiver on file for ${season}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Waiver received, ${name.split(' ')[0]}!</h2>
      ${p(`Your parent/guardian waiver for the <strong>${season}</strong> season has been submitted and is on file.`)}
      ${p("You're now able to sign up for events. We look forward to seeing you out there!")}
      ${btn('Browse upcoming events →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

export function emailEventPublished(
  memberName: string,
  eventTitle: string,
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
  location: string,
  creditHours: number,
  description: string | null,
  slotsTotal: number,
) {
  const rows = [
    { label: 'Date', value: eventDate },
    ...(startTime ? [{ label: 'Time', value: startTime + (endTime ? ` – ${endTime}` : '') }] : []),
    { label: 'Location', value: location },
    { label: 'Credit hours', value: `${creditHours} hr${creditHours !== 1 ? 's' : ''}` },
    ...(slotsTotal > 0 ? [{ label: 'Open spots', value: `${slotsTotal}` }] : []),
  ]
  return {
    subject: `JJWL — New event: ${eventTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">New event posted, ${memberName.split(' ')[0]}!</h2>
      ${p(`A new service opportunity has been added — <strong>${eventTitle}</strong>. Sign up while spots are available!`)}
      ${infoBox(rows)}
      ${description ? `<p style="margin:0 0 16px;font-size:14px;color:#374151;font-style:italic;">${description}</p>` : ''}
      ${btn('Sign up now →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

export function emailEventCancelledToSignup(
  memberName: string,
  eventTitle: string,
  eventDate: string,
) {
  return {
    subject: `JJWL — Event update: ${eventTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${memberName.split(' ')[0]},</h2>
      ${p(`We wanted to let you know that <strong>${eventTitle}</strong> (${eventDate}) has been updated and your signup has been removed.`)}
      ${p("We apologize for any inconvenience. Check back soon for other upcoming service opportunities.")}
      ${btn('View upcoming events →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

export function emailYearEndCertificate(name: string, totalHours: number, season: string) {
  const qualifies = totalHours >= 6
  return {
    subject: qualifies
      ? `JJWL — Congratulations! You've earned your ${season} certificate`
      : `JJWL — Your ${season} season summary`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">${qualifies ? `Congratulations, ${name.split(' ')[0]}!` : `Hi ${name.split(' ')[0]},`}</h2>
      ${infoBox([
        { label: 'Season', value: season },
        { label: 'Total hours completed', value: `${totalHours.toFixed(1)} hrs` },
        { label: 'Certificate', value: qualifies ? '✓ Earned (6+ hours)' : 'Not yet earned (minimum 6 hours required)' },
      ])}
      ${qualifies
        ? p("You've completed the minimum 6 service hours required for the JWL Youth in Philanthropy end-of-year certificate. We're so proud of your dedication to our community!")
        : p("Thank you for your participation in JJWL this season. To earn the end-of-year certificate, members need to complete a minimum of 6 service hours. We hope to see you back next season!")
      }
      ${btn('View my dashboard →', 'https://portal.jwlhuntington.org/jjwl/dashboard')}
    `),
  }
}

// ─── Admin emails ─────────────────────────────────────────────────────────────

export function emailAdminNewRegistration(memberName: string, memberEmail: string, grade: string, school: string) {
  return {
    subject: `JJWL — New registration: ${memberName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">New JJWL Registration</h2>
      ${p('A new member has submitted a JJWL registration and is awaiting your approval.')}
      ${infoBox([
        { label: 'Name', value: memberName },
        { label: 'Email', value: memberEmail },
        { label: 'Grade', value: grade },
        { label: 'School', value: school },
      ])}
      ${btn('Review registration →', 'https://portal.jwlhuntington.org/admin/jjwl/members')}
    `),
  }
}

export function emailAdminEventSignup(memberName: string, memberEmail: string, eventTitle: string, eventDate: string, timeSlot: string | null) {
  return {
    subject: `JJWL — New signup: ${memberName} for ${eventTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">New Event Signup</h2>
      ${infoBox([
        { label: 'Member', value: memberName },
        { label: 'Email', value: memberEmail },
        { label: 'Event', value: eventTitle },
        { label: 'Date', value: eventDate },
        ...(timeSlot ? [{ label: 'Time slot', value: timeSlot }] : []),
      ])}
      ${btn('View event roster →', 'https://portal.jwlhuntington.org/admin/jjwl/events')}
    `),
  }
}

export function emailAdminEventCancellation(memberName: string, memberEmail: string, eventTitle: string, eventDate: string) {
  return {
    subject: `JJWL — Cancellation: ${memberName} cancelled for ${eventTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Event Signup Cancelled</h2>
      ${infoBox([
        { label: 'Member', value: memberName },
        { label: 'Email', value: memberEmail },
        { label: 'Event', value: eventTitle },
        { label: 'Date', value: eventDate },
      ])}
      ${btn('View event roster →', 'https://portal.jwlhuntington.org/admin/jjwl/events')}
    `),
  }
}

type RosterMember = { name: string; email: string; phone: string; timeSlot: string | null }

export function emailAdminRoster(
  eventTitle: string,
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
  location: string,
  members: RosterMember[],
  daysOut: number,
) {
  const when = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`
  const hasSlots = members.some(m => m.timeSlot)

  const memberRows = members.map(m => `
    <tr>
      <td style="padding:8px 12px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">${m.name}</td>
      <td style="padding:8px 12px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${m.email}</td>
      <td style="padding:8px 12px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${m.phone}</td>
      ${hasSlots ? `<td style="padding:8px 12px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${m.timeSlot ?? '—'}</td>` : ''}
    </tr>
  `).join('')

  const tableHeaders = `
    <tr style="background:#f9fafb;">
      <th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Name</th>
      <th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Email</th>
      <th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Phone</th>
      ${hasSlots ? '<th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Time Slot</th>' : ''}
    </tr>
  `

  return {
    subject: `JJWL Roster — ${eventTitle} (${when}) — ${members.length} registered`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">${daysOut === 1 ? 'Final' : ''} Roster: ${eventTitle}</h2>
      ${p(`<strong>${eventTitle}</strong> is ${when}. Here is the ${daysOut === 1 ? 'final' : 'current'} list of registered members (${members.length} total).`)}
      ${infoBox([
        { label: 'Date', value: eventDate },
        ...(startTime ? [{ label: 'Time', value: startTime + (endTime ? ` – ${endTime}` : '') }] : []),
        { label: 'Location', value: location },
        { label: 'Registered', value: String(members.length) },
      ])}
      ${members.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:8px;" cellpadding="0" cellspacing="0">
          <thead>${tableHeaders}</thead>
          <tbody>${memberRows}</tbody>
        </table>
      ` : p('<em>No members are currently signed up for this event.</em>')}
      ${btn('View event in portal →', 'https://portal.jwlhuntington.org/admin/jjwl/events')}
    `),
  }
}

// ─── Approval token helper ────────────────────────────────────────────────────

export async function createApprovalToken(
  entityType: 'social_worker' | 'jwl_member',
  entityId: string,
): Promise<string | null> {
  const { randomBytes } = await import('crypto')
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await db.from('approval_tokens').insert({
    token,
    entity_type: entityType,
    entity_id: entityId,
    expires_at: expiresAt,
  })

  return error ? null : `https://portal.jwlhuntington.org/api/approve/${token}`
}

// ─── Holiday Charities / Portal emails ───────────────────────────────────────

const ADMIN_URL = 'https://portal.jwlhuntington.org/admin'

export function emailAdminNewSocialWorker(name: string, email: string, schools: string, approvalUrl?: string) {
  return {
    subject: `JWL Portal — New social worker registration: ${name}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">New Social Worker Registration</h2>
      ${p('A new social worker has registered and is awaiting your approval.')}
      ${infoBox([
        { label: 'Name', value: name },
        { label: 'Email', value: email },
        { label: 'Schools', value: schools },
      ])}
      ${approvalUrl ? `
        ${btn('Approve now →', approvalUrl)}
        ${p('<small style="color:#6b7280;">This approval link expires in 7 days. After that, approve from the portal.</small>')}
      ` : ''}
      ${btn('View in portal →', `${ADMIN_URL}/social-workers`)}
    `),
  }
}

export function emailAdminNewMember(name: string, email: string, approvalUrl?: string) {
  return {
    subject: `JWL Portal — New member registration: ${name}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">New JWL Member Registration</h2>
      ${p('A new JWL member has registered and is awaiting your approval.')}
      ${infoBox([
        { label: 'Name', value: name },
        { label: 'Email', value: email },
      ])}
      ${approvalUrl ? `
        ${btn('Approve now →', approvalUrl)}
        ${p('<small style="color:#6b7280;">This approval link expires in 7 days. After that, approve from the portal.</small>')}
      ` : ''}
      ${btn('View in portal →', `${ADMIN_URL}/members`)}
    `),
  }
}

export function emailMemberChildrenAssigned(memberName: string, childCount: number, changeDescription: string) {
  return {
    subject: `JWL Portal — Your children assignment has been updated`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${memberName.split(' ')[0]},</h2>
      ${p(`Your children assignment has been updated. ${changeDescription}`)}
      ${infoBox([{ label: 'Total assigned', value: `${childCount} child${childCount !== 1 ? 'ren' : ''}` }])}
      ${btn('View my dashboard →', 'https://portal.jwlhuntington.org/members/dashboard')}
    `),
  }
}

export function emailAdminChildrenRequested(memberName: string, changeDescription: string) {
  return {
    subject: `JWL Portal — Children request updated: ${memberName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Children Request Updated</h2>
      ${p(`<strong>${memberName}</strong> has updated their children request.`)}
      ${p(changeDescription)}
      ${btn('View members →', `${ADMIN_URL}/members`)}
    `),
  }
}

export function emailSocialWorkerSubmissionReceived(
  swName: string,
  familyName: string,
  children: { name: string; age?: number | null }[],
) {
  const childRows = children.map(c =>
    `<tr><td style="padding:6px 12px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">${c.name}</td>
     <td style="padding:6px 12px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${c.age != null ? `${c.age} yrs` : '—'}</td></tr>`
  ).join('')
  return {
    subject: `JWL Portal — Submission confirmed: ${familyName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Submission Confirmed</h2>
      ${p(`Hi ${swName.split(' ')[0]}, the family intake for <strong>${familyName}</strong> has been successfully submitted. Here is a record of the children included:`)}
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;" cellpadding="0" cellspacing="0">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Child Name</th>
          <th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Age</th>
        </tr></thead>
        <tbody>${childRows}</tbody>
      </table>
      ${p('Please keep this email as your confirmation. If you have any questions, contact your JWL coordinator.')}
    `),
  }
}

export function emailAdminNewGrant(swName: string, swEmail: string, grantType: string, requestedAmount: number) {
  const label = grantType === 'charitable_children' ? 'Charitable Children' : 'Lift Fund'
  return {
    subject: `JWL Portal — New grant application: ${label} from ${swName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">New Grant Application</h2>
      ${infoBox([
        { label: 'Social worker', value: swName },
        { label: 'Email', value: swEmail },
        { label: 'Grant type', value: label },
        { label: 'Amount requested', value: `$${requestedAmount.toLocaleString()}` },
      ])}
      ${btn('Review application →', `${ADMIN_URL}/grants`)}
    `),
  }
}

export function emailAdminGrantActivity(swName: string, applicationId: string, activityType: 'message' | 'document', detail: string) {
  const verb = activityType === 'message' ? 'sent a message' : 'uploaded a document'
  return {
    subject: `JWL Portal — Grant update from ${swName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Grant Application Update</h2>
      ${p(`<strong>${swName}</strong> has ${verb} on their grant application.`)}
      ${detail ? infoBox([{ label: activityType === 'message' ? 'Message' : 'File', value: detail }]) : ''}
      ${btn('View application →', `${ADMIN_URL}/grants/${applicationId}`)}
    `),
  }
}

export function emailSocialWorkerGrantActivity(swName: string, applicationId: string, activityType: 'message' | 'document' | 'status', detail: string) {
  const verb = activityType === 'message' ? 'sent you a message'
    : activityType === 'document' ? 'uploaded a document'
    : 'updated the status of'
  return {
    subject: `JWL Portal — Update on your grant application`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p(`The JWL team has ${verb} your grant application.`)}
      ${detail ? infoBox([{ label: activityType === 'message' ? 'Message' : activityType === 'document' ? 'File' : 'Status', value: detail }]) : ''}
      ${btn('View your application →', `https://portal.jwlhuntington.org/grants/${applicationId}`)}
    `),
  }
}

export function emailSocialWorkerGrantStatusUpdate(swName: string, applicationId: string, status: string, approvedAmount?: number, denialReason?: string) {
  const statusLabel: Record<string, string> = {
    under_review: 'Under Review',
    needs_more_info: 'More Information Needed',
    approved: 'Approved',
    denied: 'Denied',
    paid_closed: 'Paid & Closed',
  }
  const label = statusLabel[status] ?? status
  const isApproved = status === 'approved'
  const isDenied = status === 'denied'

  const detail = isApproved && approvedAmount
    ? `Your application has been approved for <strong>$${approvedAmount.toLocaleString()}</strong>. The JWL team will be in touch regarding next steps.`
    : isDenied && denialReason
    ? `Unfortunately your application has been denied. Reason: <em>${denialReason}</em>`
    : `Your application status has been updated to <strong>${label}</strong>.`

  return {
    subject: `JWL Portal — Grant application status: ${label}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${infoBox([{ label: 'Status', value: label }])}
      ${p(detail)}
      ${p('If you have any questions, please log in and send a message through the portal.')}
      ${btn('View your application →', `https://portal.jwlhuntington.org/grants/${applicationId}`)}
    `),
  }
}

// Returns the super admin email plus any JWL admins/reviewers for portal notifications
// ─── Holiday Charities — Social Worker transactional emails ──────────────────

export function emailSWRegistrationReceived(swName: string) {
  return {
    subject: 'JWL Portal — Registration received',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p('Thank you for registering with the JWL Huntington Holiday Charities program. Your registration has been received and a program administrator will review it shortly.')}
      ${p('You will receive a follow-up email once your account has been approved. No action is needed from you at this time.')}
      ${p('If you have questions in the meantime, please contact your JWL coordinator.')}
    `),
  }
}

export function emailSWRegistrationApproved(swName: string) {
  return {
    subject: 'JWL Portal — Your account has been approved',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p('Your JWL Portal account has been approved. You can now log in to submit family intake forms and manage your cases.')}
      ${btn('Log in to the portal →', 'https://portal.jwlhuntington.org/login')}
      ${p('If you have any questions, please contact your JWL coordinator.')}
    `),
  }
}

export function emailSWRegistrationRejected(swName: string, reason?: string) {
  return {
    subject: 'JWL Portal — Registration update',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p('Thank you for your interest in the JWL Huntington Holiday Charities program. After review, we were unable to approve your registration at this time.')}
      ${reason ? infoBox([{ label: 'Reason', value: reason }]) : ''}
      ${p('If you believe this is an error or have questions, please reach out to your JWL coordinator directly.')}
    `),
  }
}

export function emailSWFamilyRejected(swName: string, familyName: string, reason?: string) {
  return {
    subject: `JWL Portal — Family submission update: ${familyName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p(`The family submission for <strong>${familyName}</strong> was reviewed and could not be approved at this time.`)}
      ${reason ? infoBox([{ label: 'Reason', value: reason }]) : ''}
      ${p('If you have questions or believe this decision should be reconsidered, please contact your JWL coordinator.')}
    `),
  }
}

export function emailSWFamilyAdjusted(
  swName: string,
  familyName: string,
  changes: string[],
  changedByName: string,
  changedByRole: string,
  familyRef: string,
) {
  const changeList = changes.map(c =>
    `<li style="margin:4px 0;font-size:14px;color:#374151;">${c}</li>`
  ).join('')
  return {
    subject: `JWL Portal — Family record updated: ${familyName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Family Record Updated</h2>
      ${p(`Hi ${swName.split(' ')[0]}, a change was made to the <strong>${familyName}</strong> record.`)}
      ${infoBox([
        { label: 'Changed by', value: `${changedByName} (${changedByRole})` },
        { label: 'Family ref', value: familyRef },
        { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
      ])}
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">What changed:</p>
      <ul style="margin:0 0 16px;padding-left:20px;">${changeList}</ul>
      ${btn('View your portal →', 'https://portal.jwlhuntington.org/login')}
    `),
  }
}

export function emailAdminFamilyAdjusted(
  familyName: string,
  swName: string,
  swEmail: string,
  changes: string[],
  changedByName: string,
  changedByRole: string,
  familyRef: string,
) {
  const changeList = changes.map(c =>
    `<li style="margin:4px 0;font-size:14px;color:#374151;">${c}</li>`
  ).join('')
  return {
    subject: `JWL Portal — Audit: ${familyName} record updated by ${changedByName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Family Record Audit Copy</h2>
      ${p(`A change was made to the <strong>${familyName}</strong> record. This is an automatic audit copy.`)}
      ${infoBox([
        { label: 'Social worker', value: `${swName} (${swEmail})` },
        { label: 'Changed by', value: `${changedByName} (${changedByRole})` },
        { label: 'Family ref', value: familyRef },
        { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
      ])}
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">What changed:</p>
      <ul style="margin:0 0 16px;padding-left:20px;">${changeList}</ul>
      ${btn('View in admin portal →', `${ADMIN_URL}/families`)}
    `),
  }
}

export function emailBroadcastSeasonOpen(swName: string) {
  return {
    subject: 'JWL Holiday Charities — We\'re now accepting family submissions',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p('The JWL Huntington Holiday Charities program is now open for the season. You can log in to the portal to begin submitting family intake forms.')}
      ${btn('Log in and submit families →', 'https://portal.jwlhuntington.org/login')}
      ${p('If you have any questions about eligibility or the intake process, please contact your JWL coordinator.')}
    `),
  }
}

export function emailBroadcastDeadlineReminder(swName: string, deadline: string, hasSubmissions: boolean) {
  return {
    subject: 'JWL Holiday Charities — Submission deadline reminder',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p(`This is a reminder that the deadline to submit family intake forms for the Holiday Charities program is <strong>${deadline}</strong>.`)}
      ${!hasSubmissions ? p('<strong>We have not yet received any submissions from you.</strong> If you have families to submit, please log in as soon as possible.') : ''}
      ${p('Families submitted after the deadline may not be able to be accommodated this season.')}
      ${btn('Log in and submit families →', 'https://portal.jwlhuntington.org/login')}
    `),
  }
}

export function emailSWSeasonReset(swName: string) {
  return {
    subject: 'JWL Holiday Charities — Season has concluded',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${swName.split(' ')[0]},</h2>
      ${p('The Holiday Charities program season has concluded. Your portal has been reset and is ready for the next season.')}
      ${p('You can log in to review your previous entries, make any updates, or remove records that are no longer needed. When the new season opens, you will receive a notification with instructions to begin submitting.')}
      ${btn('Log in to the portal →', 'https://portal.jwlhuntington.org/login')}
    `),
  }
}

export function emailAdminSeasonReset(swCount: number) {
  return {
    subject: 'JWL Portal — Season reset completed',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Season Reset Complete</h2>
      ${p('The Holiday Charities season reset has been completed successfully.')}
      ${infoBox([
        { label: 'Social workers notified', value: `${swCount}` },
        { label: 'Reset at', value: new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short' }) },
      ])}
      ${p('All family records have been returned to draft status. Social workers have been notified that the season has concluded.')}
      ${btn('View admin portal →', `${ADMIN_URL}/families`)}
    `),
  }
}

export function emailMemberDuesReminder(memberName: string, currentYear: number, secretaryName?: string | null, duesUrl?: string | null) {
  const exYear = currentYear + 1
  const exJoinYear = currentYear - 1
  const payUrl = duesUrl || 'https://membership-99939.cheddarup.com'
  return {
    subject: `JWL Huntington — ${currentYear} membership dues reminder`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${memberName.split(' ')[0]},</h2>
      ${p(`This is a friendly reminder that JWL Huntington membership dues for <strong>${currentYear}</strong> have not yet been recorded for you.`)}
      ${p(`Dues are renewed each January, unless you just joined — in which case it is the second January following your first year of membership (ex: if you joined in September ${exJoinYear}, you next pay dues in January ${exYear}). If you have already paid for this year and feel our records may be missing data, please let us know by emailing <a href="mailto:info@jwlhuntington.org" style="color:#1B52C1;">info@jwlhuntington.org</a>.`)}
      ${p('To pay dues online please visit:')}
      ${btn('Pay Dues Online →', payUrl)}
      ${p(`If you have any questions about your membership status or how to pay, please contact the JWL Secretary${secretaryName ? ` <strong>${secretaryName}</strong>` : ''} at <a href="mailto:info@jwlhuntington.org" style="color:#1B52C1;">info@JWLHuntington.org</a>.`)}
    `),
  }
}

export async function getPortalAdminEmails(): Promise<string[]> {
  const emails: string[] = []
  if (process.env.NEXT_PUBLIC_ADMIN_EMAIL) emails.push(process.env.NEXT_PUBLIC_ADMIN_EMAIL)

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await db
    .from('jwl_members')
    .select('email')
    .or('is_admin.eq.true,is_super_admin.eq.true,is_programs_admin.eq.true')
    .eq('status', 'approved')

  for (const m of data ?? []) {
    if (m.email && !emails.includes(m.email)) emails.push(m.email)
  }
  return emails
}

export async function getGrantsReviewerEmails(): Promise<string[]> {
  const emails: string[] = []
  if (process.env.NEXT_PUBLIC_ADMIN_EMAIL) emails.push(process.env.NEXT_PUBLIC_ADMIN_EMAIL)

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await db
    .from('jwl_members')
    .select('email')
    .or('is_grants_reviewer.eq.true,is_super_admin.eq.true')
    .eq('status', 'approved')

  for (const m of data ?? []) {
    if (m.email && !emails.includes(m.email)) emails.push(m.email)
  }
  return emails
}

// ─── JWL Meetings ─────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h % 12) || 12)}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function emailMeetingPublished(
  memberName: string, date: string, time: string, location: string,
  agenda: string | null, rsvpYesUrl: string, rsvpNoUrl: string,
  opts?: { title?: string; description?: string | null; meetingType?: string; shifts?: { label: string; start_time: string; end_time: string; signupUrl?: string | null }[]; portalUrl?: string }
) {
  const isEvent = opts?.meetingType === 'event'
  const title = opts?.title ?? (isEvent ? 'New Event' : 'New Meeting Scheduled')
  const description = opts?.description

  // Build shifts block for events — with one-click sign-up buttons when tokens are available
  const hasTokens = opts?.shifts?.some(s => s.signupUrl)
  const shiftsBlock = isEvent && opts?.shifts?.length
    ? `<div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1B52C1;">${hasTokens ? 'Sign up for a shift — one click, no login needed' : 'Available shifts — sign up in the portal'}</p>
        ${opts.shifts.map(s => `
          <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${s.label}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</p>
            </div>
            ${s.signupUrl
              ? `<a href="${s.signupUrl}" style="display:inline-block;background:#1B52C1;color:white;text-decoration:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;white-space:nowrap;">Sign me up →</a>`
              : ''}
          </div>`).join('')}
      </div>`
    : ''

  const portalLink = opts?.portalUrl
    ? `${btn('View & sign up in portal', opts.portalUrl)}`
    : ''

  return {
    subject: `New ${isEvent ? 'Event' : 'Meeting'} Added to JWL - ${title} - Please RSVP ASAP`,
    html: wrap(description
      ? `
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">${title}</h2>
        <div style="font-size:15px;line-height:1.8;color:#374151;white-space:pre-line;margin-bottom:16px;">${description}</div>
        ${shiftsBlock}
        ${isEvent
          ? `${portalLink || btn('View in portal', 'https://portal.jwlhuntington.org/members/meetings')}`
          : `<p style="margin:16px 0 8px;font-size:15px;font-weight:600;color:#111827;">Will you be attending?</p>
             ${btn("✓ Yes, I'll be there", rsvpYesUrl)}
             <a href="${rsvpNoUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 16px 12px;">✗ Can't make it</a>
             ${p('<span style="font-size:13px;color:#9ca3af;">You can change your RSVP at any time by clicking either button above.</span>')}`
        }
      `
      : `
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">${title}</h2>
        ${p(`Hi ${memberName.split(' ')[0]}, a JWL ${isEvent ? 'event' : 'meeting'} has been scheduled. We'd love to see you there!`)}
        ${infoBox([
          { label: 'Date', value: fmtDate(date) },
          { label: 'Time', value: fmtTime(time) },
          { label: 'Location', value: location },
        ])}
        ${agenda ? `<div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;"><p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1B52C1;">Agenda highlights</p><p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${agenda.replace(/\n/g, '<br>')}</p></div>` : ''}
        ${shiftsBlock}
        ${isEvent
          ? `${portalLink || btn('View in portal', 'https://portal.jwlhuntington.org/members/meetings')}`
          : `<p style="margin:16px 0 8px;font-size:15px;font-weight:600;color:#111827;">Will you be attending?</p>
             ${btn("✓ Yes, I'll be there", rsvpYesUrl)}
             <a href="${rsvpNoUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 16px 12px;">✗ Can't make it</a>
             ${p('<span style="font-size:13px;color:#9ca3af;">You can change your RSVP at any time by clicking either button above.</span>')}`
        }
      `
    ),
  }
}

export function emailMeetingReminder(memberName: string, date: string, time: string, location: string, hasRsvpd: boolean, rsvpYesUrl: string, rsvpNoUrl: string, daysOut: number) {
  const when = daysOut === 1 ? 'tomorrow' : 'in one week'
  return {
    subject: `Reminder: JWL Meeting ${when} - ${fmtDate(date)} - Please RSVP`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Meeting Reminder</h2>
      ${p(`Hi ${memberName.split(' ')[0]}, just a reminder that the JWL meeting is coming up ${when}.`)}
      ${infoBox([
        { label: 'Date', value: fmtDate(date) },
        { label: 'Time', value: fmtTime(time) },
        { label: 'Location', value: location },
      ])}
      ${hasRsvpd
        ? p("You've already RSVP'd yes — we look forward to seeing you! If your plans have changed, you can update below.")
        : p("We haven't received your RSVP yet. Will you be joining us?")}
      ${btn("✓ Yes, I'll be there", rsvpYesUrl)}
      <a href="${rsvpNoUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 16px 12px;">✗ Can't make it</a>
    `),
  }
}

// ─── JWL Meeting / Event Confirmations & Reminders ────────────────────────────

export function emailMeetingRsvpConfirmation(
  memberName: string, title: string, date: string, time: string, location: string,
  attendees: string[], rsvpNoUrl: string,
) {
  const firstName = memberName.split(' ')[0]
  const attendeeList = attendees.filter(n => n !== memberName)
  return {
    subject: `You're confirmed — ${title}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">You're in, ${firstName}! 🎉</h2>
      ${p(`Your RSVP for <strong>${title}</strong> is confirmed. We look forward to seeing you!`)}
      ${infoBox([
        { label: 'Date', value: fmtDate(date) },
        { label: 'Time', value: fmtTime(time) },
        { label: 'Location', value: location },
      ])}
      ${attendeeList.length > 0 ? `
        <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1B52C1;">Also attending (${attendeeList.length})</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;">${attendeeList.join(' · ')}</p>
        </div>` : ''}
      <a href="${rsvpNoUrl}" style="display:inline-block;background:#f3f4f6;color:#6b7280;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;margin-top:8px;">Can't make it after all? Click to cancel</a>
    `),
  }
}

export function emailEventShiftConfirmation(
  memberName: string, title: string, date: string, location: string,
  myShifts: { label: string; start_time: string; end_time: string }[],
  allShiftCounts: { label: string; count: number }[],
) {
  const firstName = memberName.split(' ')[0]
  return {
    subject: `You're signed up — ${title}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">You're signed up, ${firstName}! 🎉</h2>
      ${p(`Your signup for <strong>${title}</strong> is confirmed. Here's what you're helping with:`)}
      ${infoBox([
        { label: 'Date', value: fmtDate(date) },
        { label: 'Location', value: location },
      ])}
      <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#1B52C1;">Your shift${myShifts.length !== 1 ? 's' : ''}</p>
        ${myShifts.map(s => `<p style="margin:0 0 4px;font-size:14px;color:#111827;">· <strong>${s.label}</strong>: ${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</p>`).join('')}
      </div>
      ${allShiftCounts.length > 0 ? `
        <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;margin:12px 0;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Current volunteer count</p>
          ${allShiftCounts.map(s => `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">· ${s.label}: <strong>${s.count}</strong> signed up</p>`).join('')}
        </div>` : ''}
      ${btn('View in portal →', 'https://portal.jwlhuntington.org/members/meetings')}
    `),
  }
}

export function emailMeetingReminderFull(
  memberName: string, title: string, date: string, time: string, location: string,
  attendees: string[], daysOut: number, rsvpYesUrl: string, rsvpNoUrl: string,
) {
  const when = daysOut === 1 ? 'tomorrow' : 'in one week'
  const firstName = memberName.split(' ')[0]
  const others = attendees.filter(n => n !== memberName)
  return {
    subject: `Reminder: ${title} is ${when}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">See you ${when}, ${firstName}!</h2>
      ${p(`Just a reminder that <strong>${title}</strong> is coming up ${when}.`)}
      ${infoBox([
        { label: 'Date', value: fmtDate(date) },
        { label: 'Time', value: fmtTime(time) },
        { label: 'Location', value: location },
      ])}
      ${others.length > 0 ? `
        <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1B52C1;">Also attending (${others.length})</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;">${others.join(' · ')}</p>
        </div>` : ''}
      ${p("If your plans have changed, please let us know as soon as possible.")}
      <a href="${rsvpNoUrl}" style="display:inline-block;background:#f3f4f6;color:#6b7280;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;">Can't make it? Click to cancel</a>
    `),
  }
}

export function emailEventReminderFull(
  memberName: string, title: string, date: string, location: string,
  myShifts: { label: string; start_time: string; end_time: string }[],
  allShiftCounts: { label: string; count: number }[],
  daysOut: number,
) {
  const when = daysOut === 1 ? 'tomorrow' : 'in one week'
  const firstName = memberName.split(' ')[0]
  return {
    subject: `Reminder: ${title} is ${when}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">See you ${when}, ${firstName}!</h2>
      ${p(`Just a reminder that you're signed up for <strong>${title}</strong>, coming up ${when}.`)}
      ${infoBox([
        { label: 'Date', value: fmtDate(date) },
        { label: 'Location', value: location },
      ])}
      <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#1B52C1;">Your shift${myShifts.length !== 1 ? 's' : ''}</p>
        ${myShifts.map(s => `<p style="margin:0 0 4px;font-size:14px;color:#111827;">· <strong>${s.label}</strong>: ${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</p>`).join('')}
      </div>
      ${allShiftCounts.length > 0 ? `
        <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;margin:12px 0;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Total volunteers so far</p>
          ${allShiftCounts.map(s => `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">· ${s.label}: <strong>${s.count}</strong> signed up</p>`).join('')}
        </div>` : ''}
      ${p("We look forward to seeing you! If you can no longer make it, please let us know as soon as possible.")}
      ${btn('View in portal →', 'https://portal.jwlhuntington.org/members/meetings')}
    `),
  }
}

export function emailMeetingRecap(memberName: string, date: string, recap: string) {
  return {
    subject: `JWL Meeting Recap — ${fmtDate(date)}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Meeting Recap</h2>
      ${p(`Hi ${memberName.split(' ')[0]}, here are the notes and highlights from our ${fmtDate(date)} meeting.`)}
      <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;white-space:pre-line;">${recap}</p>
      </div>
      ${btn('View in portal', 'https://portal.jwlhuntington.org/members/meetings')}
    `),
  }
}

// ─── Grant Member Vote ─────────────────────────────────────────────────────────

export function emailGrantMemberVote(memberName: string, summary: string, voteYesUrl: string, voteNoUrl: string, voteMoreInfoUrl: string) {
  return {
    subject: 'JWL Grants — Member Vote Requested',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Grant Vote Requested</h2>
      ${p(`Hi ${memberName.split(' ')[0]}, the JWL Grants team is requesting your vote on a grant application.`)}
      <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1B52C1;">Application Summary</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-line;">${summary}</p>
      </div>
      <p style="margin:16px 0 8px;font-size:15px;font-weight:600;color:#111827;">Your vote:</p>
      ${btn('✓ Approve', voteYesUrl)}
      <a href="${voteNoUrl}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 8px 8px;">✗ Deny</a>
      <br>
      <a href="${voteMoreInfoUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 16px;">? Request More Information</a>
      ${p('<span style="font-size:13px;color:#9ca3af;">You can also vote from the member portal. Voting closes when the grants admin closes the vote.</span>')}
    `),
  }
}

export function emailGrantMoreInfoReceived(adminName: string, memberName: string, question: string, applicationId: string) {
  return {
    subject: 'JWL Grants — Member Requested More Information',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">More Information Requested</h2>
      ${p(`Hi ${adminName.split(' ')[0]}, a member has requested more information before voting on a grant application. The vote has been paused.`)}
      <div style="background:#fff8e1;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#92400e;">From: ${memberName}</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-line;">${question}</p>
      </div>
      ${btn('View application', `https://portal.jwlhuntington.org/grants/reviewer/${applicationId}`)}
      ${p('<span style="font-size:13px;color:#9ca3af;">Resume the vote from the application page after addressing the question.</span>')}
    `),
  }
}

export function emailGrantsPortalInvite(inviteeName: string, invitedByName: string, applicationId: string) {
  return {
    subject: 'JWL Huntington — You\'ve been invited to the Grants Portal',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${inviteeName.split(' ')[0]},</h2>
      ${p(`<strong>${invitedByName}</strong> from JWL Huntington has invited you to join the Grants Portal to collaborate on a grant application.`)}
      ${p('The portal lets you view the application, exchange messages with the JWL grants team, and upload supporting documents — all in one place.')}
      ${btn('Create your account →', 'https://portal.jwlhuntington.org/grants/register')}
      ${p('<span style="font-size:13px;color:#9ca3af;">If you already have an account, log in and the application will appear in your dashboard.</span>')}
      ${p('<span style="font-size:13px;color:#9ca3af;">If you did not expect this invitation or have questions, please contact your JWL coordinator directly.</span>')}
    `),
  }
}

export function emailGrantDecisionAnnouncement(memberName: string, decision: 'approved' | 'denied', message: string) {
  const icon = decision === 'approved' ? '✅' : '❌'
  const label = decision === 'approved' ? 'Grant Approved' : 'Grant Denied'
  return {
    subject: `JWL Grants — ${label}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">${icon} ${label}</h2>
      ${p(`Hi ${memberName.split(' ')[0]},`)}
      ${p(message.replace(/\n/g, '<br>'))}
      ${p('<span style="font-size:13px;color:#9ca3af;">This message was sent by the JWL Grants Committee.</span>')}
    `),
  }
}

export function emailGrantVoteConfirmation(memberName: string, vote: 'yes' | 'no' | 'more_info') {
  const labels = { yes: 'Approve', no: 'Deny', more_info: 'Request More Information' }
  const icons = { yes: '✅', no: '❌', more_info: '❓' }
  return {
    subject: 'JWL Grants — Vote Recorded',
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Vote Recorded</h2>
      ${p(`Hi ${memberName.split(' ')[0]}, your vote of <strong>${icons[vote]} ${labels[vote]}</strong> has been recorded.`)}
      ${p('<span style="font-size:13px;color:#9ca3af;">The grants admin will review all votes before making a final decision.</span>')}
    `),
  }
}
