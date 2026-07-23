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
    .eq('is_jjwl_admin', true)
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
      ${p("To activate your account, please pay your membership dues using the button below. Once we confirm your payment, your account will be fully activated.")}
      ${cheddarUpUrl ? btn('Pay Membership Dues →', cheddarUpUrl) : p("<strong>Payment link:</strong> Please contact <a href='mailto:info@jwlhuntington.org' style='color:#1B52C1;'>info@jwlhuntington.org</a> for your payment link.")}
      ${p("After payment is confirmed, you can log in at <a href='https://portal.jwlhuntington.org' style='color:#1B52C1;'>portal.jwlhuntington.org</a> to browse and sign up for events.")}
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
    .eq('is_admin', true)
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
    .eq('is_grants_reviewer', true)
    .eq('status', 'approved')

  for (const m of data ?? []) {
    if (m.email && !emails.includes(m.email)) emails.push(m.email)
  }
  return emails
}
