import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailSocialWorkerSubmissionReceived } from '@/lib/email'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminClient()

  const { data: family } = await supabase
    .from('families')
    .select('id, status')
    .eq('link_token', token)
    .single()

  if (!family) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (family.status !== 'draft') return NextResponse.json({ ok: true })

  const { error } = await supabase
    .from('families')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', family.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email the social worker a submission record
  const { data: fullFamily } = await supabase
    .from('families')
    .select('guardian_name, social_worker_id, children(name, age)')
    .eq('id', family.id)
    .maybeSingle()

  if (fullFamily) {
    const { data: sw } = await supabase
      .from('social_workers')
      .select('name, email')
      .eq('id', fullFamily.social_worker_id)
      .maybeSingle()

    if (sw?.email) {
      const { subject, html } = emailSocialWorkerSubmissionReceived(
        sw.name,
        fullFamily.guardian_name ?? 'Family',
        (fullFamily.children ?? []) as { name: string; age?: number | null }[],
      )
      await sendEmail({ to: sw.email, subject, html })
    }
  }

  return NextResponse.json({ ok: true })
}
