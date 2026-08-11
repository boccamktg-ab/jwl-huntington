import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyActionToken } from '@/lib/backpack-tokens'
import { sendEmail, emailBackpackConfirmed, emailBackpackWaitlisted } from '@/lib/email'

const MAX_CONFIRMED = 15

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function htmlPage(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#111827;}
  h2{margin:0 0 12px;}p{color:#6b7280;line-height:1.6;}a{color:#1B52C1;}</style>
  </head><body><h2>${title}</h2>${body}</body></html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  const action = searchParams.get('action')
  const token = searchParams.get('token')

  if (!id || !action || !token) {
    return new Response(htmlPage('Invalid link', '<p>This link is missing required parameters.</p>'), { headers: { 'Content-Type': 'text/html' } })
  }

  if (!['confirm', 'waitlist'].includes(action)) {
    return new Response(htmlPage('Invalid action', '<p>Unknown action.</p>'), { headers: { 'Content-Type': 'text/html' } })
  }

  if (!verifyActionToken(id, action, token)) {
    return new Response(htmlPage('Invalid link', '<p>This link is invalid or has expired.</p>'), { headers: { 'Content-Type': 'text/html' } })
  }

  const admin = db()

  const { data: signup } = await admin
    .from('backpack_signups')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!signup) {
    return new Response(htmlPage('Not found', '<p>Signup not found.</p>'), { headers: { 'Content-Type': 'text/html' } })
  }

  if (signup.status === 'confirmed' && action === 'confirm') {
    return new Response(htmlPage('Already confirmed', `<p>${signup.name} is already confirmed.</p><p><a href="https://portal.jwlhuntington.org/admin/backpacks">View all signups →</a></p>`), { headers: { 'Content-Type': 'text/html' } })
  }
  if (signup.status === 'waitlisted' && action === 'waitlist') {
    return new Response(htmlPage('Already waitlisted', `<p>${signup.name} is already on the waitlist.</p><p><a href="https://portal.jwlhuntington.org/admin/backpacks">View all signups →</a></p>`), { headers: { 'Content-Type': 'text/html' } })
  }

  if (action === 'confirm') {
    const { count } = await admin
      .from('backpack_signups')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')

    if ((count ?? 0) >= MAX_CONFIRMED) {
      return new Response(htmlPage('At capacity', `<p>You've reached ${MAX_CONFIRMED} confirmed volunteers. ${signup.name} was not confirmed — use Waitlist instead.</p><p><a href="https://portal.jwlhuntington.org/admin/backpacks">View all signups →</a></p>`), { headers: { 'Content-Type': 'text/html' } })
    }

    await admin.from('backpack_signups').update({ status: 'confirmed' }).eq('id', id)
    const { subject, html } = emailBackpackConfirmed(signup.name)
    await sendEmail({ to: signup.email, subject, html })

    return new Response(htmlPage('✓ Confirmed', `<p><strong>${signup.name}</strong> has been confirmed and sent their confirmation email with the event location.</p><p><a href="https://portal.jwlhuntington.org/admin/backpacks">View all signups →</a></p>`), { headers: { 'Content-Type': 'text/html' } })
  }

  if (action === 'waitlist') {
    await admin.from('backpack_signups').update({ status: 'waitlisted' }).eq('id', id)
    const { subject, html } = emailBackpackWaitlisted(signup.name)
    await sendEmail({ to: signup.email, subject, html })

    return new Response(htmlPage('Waitlisted', `<p><strong>${signup.name}</strong> has been moved to the waitlist and notified.</p><p><a href="https://portal.jwlhuntington.org/admin/backpacks">View all signups →</a></p>`), { headers: { 'Content-Type': 'text/html' } })
  }
}
