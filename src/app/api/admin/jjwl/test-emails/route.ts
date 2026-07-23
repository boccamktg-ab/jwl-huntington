import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  emailRegistrationSubmitted,
  emailRegistrationApproved,
  emailEventSignupConfirmation,
  emailMemberEventReminder,
  emailHoursConfirmed,
  emailAdminNewRegistration,
  emailAdminEventSignup,
  emailAdminEventCancellation,
  emailAdminRoster,
} from '@/lib/email'

const DUMMY_EVENT = {
  title: 'Community Cleanup Day',
  date: 'Saturday, August 2, 2025',
  startTime: '09:00',
  endTime: '12:00',
  location: 'Huntington Village Green',
  timeSlot: 'Morning Shift (9–10:30am)',
  creditHours: 3,
}

const DUMMY_MEMBER = {
  name: 'Test Member',
  email: '', // filled at runtime
  grade: '9th',
  school: 'Huntington High School',
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!user || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const to = adminEmail!
  DUMMY_MEMBER.email = to

  const templates = [
    emailRegistrationSubmitted(DUMMY_MEMBER.name),
    emailRegistrationApproved(DUMMY_MEMBER.name, 'https://cheddarup.com/example'),
    emailEventSignupConfirmation(
      DUMMY_MEMBER.name,
      DUMMY_EVENT.title,
      DUMMY_EVENT.date,
      DUMMY_EVENT.startTime,
      DUMMY_EVENT.endTime,
      DUMMY_EVENT.location,
      DUMMY_EVENT.timeSlot,
      DUMMY_EVENT.creditHours,
    ),
    emailMemberEventReminder(
      DUMMY_MEMBER.name,
      DUMMY_EVENT.title,
      DUMMY_EVENT.date,
      DUMMY_EVENT.startTime,
      DUMMY_EVENT.endTime,
      DUMMY_EVENT.location,
      DUMMY_EVENT.timeSlot,
      7,
    ),
    emailMemberEventReminder(
      DUMMY_MEMBER.name,
      DUMMY_EVENT.title,
      DUMMY_EVENT.date,
      DUMMY_EVENT.startTime,
      DUMMY_EVENT.endTime,
      DUMMY_EVENT.location,
      DUMMY_EVENT.timeSlot,
      2,
    ),
    emailHoursConfirmed(DUMMY_MEMBER.name, DUMMY_EVENT.title, DUMMY_EVENT.creditHours),
    emailAdminNewRegistration(DUMMY_MEMBER.name, to, DUMMY_MEMBER.grade, DUMMY_MEMBER.school),
    emailAdminEventSignup(DUMMY_MEMBER.name, to, DUMMY_EVENT.title, DUMMY_EVENT.date, DUMMY_EVENT.timeSlot),
    emailAdminEventCancellation(DUMMY_MEMBER.name, to, DUMMY_EVENT.title, DUMMY_EVENT.date),
    emailAdminRoster(
      DUMMY_EVENT.title,
      DUMMY_EVENT.date,
      DUMMY_EVENT.startTime,
      DUMMY_EVENT.endTime,
      DUMMY_EVENT.location,
      [
        { name: 'Test Member', email: to, phone: '(631) 555-0101', timeSlot: 'Morning Shift (9–10:30am)' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '(631) 555-0102', timeSlot: 'Late Shift (10:30am–12pm)' },
      ],
      7,
    ),
  ]

  const results: { subject: string; success: boolean; error?: string }[] = []

  for (const { subject, html } of templates) {
    const r = await sendEmail({ to, subject, html })
    results.push({ subject, success: r.success, error: r.error })
  }

  return NextResponse.json({ sent: results.length, results })
}
