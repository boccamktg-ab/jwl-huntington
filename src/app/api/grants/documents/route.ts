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
    const applicationId = formData.get('application_id') as string
    const files = formData.getAll('files') as File[]

    if (!applicationId || !files.length) {
      return NextResponse.json({ error: 'Missing application_id or files' }, { status: 400 })
    }

    const { data: app } = await supabase
      .from('grant_applications')
      .select('id')
      .eq('id', applicationId)
      .eq('referrer_id', sw.id)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const admin = db()
    const uploaded: { file_name: string; file_url: string }[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `grants/${applicationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await admin.storage
        .from('grant-documents')
        .upload(path, buffer, { contentType: file.type || 'application/octet-stream' })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json({ error: `Failed to upload ${file.name}: ${uploadError.message}` }, { status: 500 })
      }

      uploaded.push({ file_name: file.name, file_url: path })
    }

    const { error: docError } = await admin
      .from('grant_documents')
      .insert(uploaded.map(u => ({
        application_id: applicationId,
        file_name: u.file_name,
        file_url: u.file_url,
        uploaded_by: sw.id,
      })))

    if (docError) {
      console.error(docError)
      return NextResponse.json({ error: 'Failed to save document records' }, { status: 500 })
    }

    const reviewerEmails = await getGrantsReviewerEmails()
    if (reviewerEmails.length > 0) {
      const fileNames = uploaded.map(u => u.file_name).join(', ')
      const { subject, html } = emailAdminGrantActivity(sw.name ?? 'Social worker', applicationId, 'document', fileNames)
      await sendEmail({ to: reviewerEmails, subject, html })
    }

    return NextResponse.json({ uploaded: uploaded.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
