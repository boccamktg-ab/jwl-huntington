import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sw } = await supabase
      .from('social_workers')
      .select('id, status')
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

    // Verify referrer owns this application
    const { data: app } = await supabase
      .from('grant_applications')
      .select('id')
      .eq('id', applicationId)
      .eq('referrer_id', sw.id)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const service = await createServiceClient()
    const uploaded: { file_name: string; file_url: string }[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `grants/${applicationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await service.storage
        .from('grant-documents')
        .upload(path, file, { contentType: file.type })

      if (uploadError) {
        console.error(uploadError)
        return NextResponse.json({ error: `Failed to upload ${file.name}` }, { status: 500 })
      }

      const { data: urlData } = service.storage
        .from('grant-documents')
        .getPublicUrl(path)

      uploaded.push({ file_name: file.name, file_url: urlData.publicUrl })
    }

    const { error: docError } = await service
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

    return NextResponse.json({ uploaded: uploaded.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
