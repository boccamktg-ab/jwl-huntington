import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'
import { sendEmail } from '@/lib/email'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = adminClient()

  const { data: sw } = await db
    .from('social_workers')
    .select('auth_id')
    .eq('id', id)
    .maybeSingle()

  if (!sw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await db.from('social_workers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (sw.auth_id) {
    await db.auth.admin.deleteUser(sw.auth_id)
  }

  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, status } = await request.json()
  if (!id || !['approved', 'disabled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const db = adminClient()

  const { data: sw } = await db
    .from('social_workers')
    .select('name, email')
    .eq('id', id)
    .maybeSingle()

  const { error } = await db
    .from('social_workers')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'approved' && sw?.email) {
    await sendEmail({
      to: sw.email,
      subject: 'JWL Portal — Your account has been approved!',
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#111827;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <div style="background:#1B52C1;padding:20px 32px;border-radius:8px 8px 0 0;">
            <p style="margin:0;color:white;font-size:16px;font-weight:600;">Junior Welfare League of Huntington</p>
          </div>
          <div style="padding:28px 32px;">
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Hi ${sw.name.split(' ')[0]},</h2>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Your JWL Portal account has been approved. You can now log in to submit family intake forms and manage your cases.</p>
            <a href="https://portal.jwlhuntington.org/login" style="display:inline-block;background:#1B52C1;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 16px;">Log in to the portal →</a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Junior Welfare League of Huntington · <a href="https://portal.jwlhuntington.org" style="color:#1B52C1;">portal.jwlhuntington.org</a></p>
          </div>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true })
}
