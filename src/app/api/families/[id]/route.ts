import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailSWFamilyAdjusted, emailAdminFamilyAdjusted, getPortalAdminEmails } from '@/lib/email'

function swClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
}

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = swClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sw } = await supabase
    .from('social_workers')
    .select('id, name, email')
    .eq('auth_id', user.id)
    .single()
  if (!sw) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { familyNumber, numChildren, languagePref, schoolId } = await request.json()

  // Fetch current state for diff (only matters if already submitted)
  const admin = adminDb()
  const { data: before } = await admin
    .from('families')
    .select('family_number, num_children, language_pref, school_id, guardian_name, status, schools(name)')
    .eq('id', id)
    .eq('social_worker_id', sw.id)
    .maybeSingle()

  const { error } = await supabase
    .from('families')
    .update({ family_number: familyNumber, num_children: numChildren, language_pref: languagePref, school_id: schoolId })
    .eq('id', id)
    .eq('social_worker_id', sw.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send audit trail only for post-submission edits
  if (before && ['submitted', 'approved'].includes(before.status)) {
    const changes: string[] = []
    if (familyNumber !== before.family_number) changes.push(`Family # updated from ${before.family_number ?? '—'} to ${familyNumber}`)
    if (numChildren !== before.num_children) changes.push(`# children updated from ${before.num_children ?? '—'} to ${numChildren}`)
    if (languagePref !== before.language_pref) changes.push(`Language preference updated from ${before.language_pref ?? '—'} to ${languagePref}`)
    if (schoolId !== before.school_id) {
      const { data: newSchool } = await admin.from('schools').select('name').eq('id', schoolId).maybeSingle()
      const oldSchool = Array.isArray(before.schools) ? before.schools[0] : before.schools
      changes.push(`School updated from ${oldSchool?.name ?? '—'} to ${newSchool?.name ?? schoolId}`)
    }

    if (changes.length > 0) {
      const familyName = before.guardian_name ?? `Family #${before.family_number}`
      const familyRef = `#${before.family_number}`

      await admin.from('family_change_log').insert({
        family_id: id,
        changed_by_name: sw.name,
        changed_by_role: 'social_worker',
        change_summary: changes.join('; '),
      })

      const { subject: swSubj, html: swHtml } = emailSWFamilyAdjusted(sw.name, familyName, changes, sw.name, 'Social Worker', familyRef)
      await sendEmail({ to: sw.email, subject: swSubj, html: swHtml })

      const adminEmails = await getPortalAdminEmails()
      if (adminEmails.length > 0) {
        const { subject: adminSubj, html: adminHtml } = emailAdminFamilyAdjusted(familyName, sw.name, sw.email, changes, sw.name, 'Social Worker', familyRef)
        await sendEmail({ to: adminEmails, subject: adminSubj, html: adminHtml })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
