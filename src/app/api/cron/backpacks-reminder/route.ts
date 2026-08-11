import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailBackpackReminder } from '@/lib/email'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const admin = db()

  const { data: confirmed } = await admin
    .from('backpack_signups')
    .select('id, name, email')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)

  let sent = 0
  for (const s of confirmed ?? []) {
    const { subject, html } = emailBackpackReminder(s.name)
    await sendEmail({ to: s.email, subject, html })
    await admin.from('backpack_signups').update({ reminder_sent: true }).eq('id', s.id)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
