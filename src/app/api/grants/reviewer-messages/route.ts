import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { sendEmail, emailSocialWorkerGrantActivity } from '@/lib/email'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isSuperAdmin = isSuperAdminEmail(user.email)

    const { data: member } = await db()
      .from('jwl_members')
      .select('id, status, is_grants_reviewer, is_admin')
      .eq('auth_id', user.id)
      .maybeSingle()

    const isAdmin = isSuperAdmin || (member?.is_admin ?? false)
    const isReviewer = member?.status === 'approved' && (member?.is_grants_reviewer ?? false)

    if (!isAdmin && !isReviewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const application_id = formData.get('application_id') as string
    const body = (formData.get('body') as string | null) ?? ''
    const file = formData.get('file') as File | null

    if (!application_id || (!body.trim() && !file)) {
      return NextResponse.json({ error: 'Missing application_id or message content' }, { status: 400 })
    }

    const { data: app } = await db()
      .from('grant_applications')
      .select('id, status')
      .eq('id', application_id)
      .single()

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (['approved', 'denied', 'paid_closed'].includes(app.status)) {
      return NextResponse.json({ error: 'Cannot message on a closed application' }, { status: 400 })
    }

    let attachment_url: string | null = null
    let attachment_name: string | null = null

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()
      const path = `grants/${application_id}/messages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await db().storage
        .from('grant-documents')
        .upload(path, buffer, { contentType: file.type || 'application/octet-stream' })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }

      attachment_url = path
      attachment_name = file.name
    }

    const { error } = await db()
      .from('grant_messages')
      .insert({ application_id, author_id: user.id, body: body.trim(), attachment_url, attachment_name })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Notify the social worker
    const { data: grantApp } = await db()
      .from('grant_applications')
      .select('referrer_id')
      .eq('id', application_id)
      .maybeSingle()
    if (grantApp) {
      const { data: sw } = await db()
        .from('social_workers')
        .select('name, email')
        .eq('id', grantApp.referrer_id)
        .maybeSingle()
      if (sw?.email) {
        const activityType = file && file.size > 0 ? 'document' : 'message'
        const detail = activityType === 'message' ? body.trim().slice(0, 200) : (file?.name ?? '')
        const { subject, html } = emailSocialWorkerGrantActivity(sw.name, application_id, activityType, detail)
        await sendEmail({ to: sw.email, subject, html })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
