import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminSupabase } from '@supabase/supabase-js'
import { sendEmail, getGrantsReviewerEmails, emailAdminGrantActivity } from '@/lib/email'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sw } = await supabase
      .from('social_workers')
      .select('id, name, status')
      .eq('auth_id', user.id)
      .single()

    if (!sw || sw.status !== 'approved') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    const formData = await req.formData()
    const application_id = formData.get('application_id') as string
    const body = (formData.get('body') as string | null) ?? ''
    const file = formData.get('file') as File | null

    if (!application_id || (!body.trim() && !file)) {
      return NextResponse.json({ error: 'Missing application_id or message content' }, { status: 400 })
    }

    const { data: app } = await supabase
      .from('grant_applications')
      .select('id, status')
      .eq('id', application_id)
      .eq('referrer_id', sw.id)
      .single()

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (['approved', 'denied', 'paid_closed'].includes(app.status)) {
      return NextResponse.json({ error: 'Cannot message on a closed application' }, { status: 400 })
    }

    const admin = db()

    let attachment_url: string | null = null
    let attachment_name: string | null = null

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()
      const path = `grants/${application_id}/messages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await admin.storage
        .from('grant-documents')
        .upload(path, buffer, { contentType: file.type || 'application/octet-stream' })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }

      attachment_url = path
      attachment_name = file.name
    }

    const { error } = await admin
      .from('grant_messages')
      .insert({ application_id, author_id: user.id, body: body.trim(), attachment_url, attachment_name })

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const reviewerEmails = await getGrantsReviewerEmails()
    if (reviewerEmails.length > 0) {
      const activityType = file && file.size > 0 ? 'document' : 'message'
      const detail = activityType === 'message' ? body.trim().slice(0, 200) : (file?.name ?? '')
      const { subject, html } = emailAdminGrantActivity(sw.name ?? 'Social worker', application_id, activityType, detail)
      await sendEmail({ to: reviewerEmails, subject, html })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
