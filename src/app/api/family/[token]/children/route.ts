import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailSWFamilyAdjusted, emailAdminFamilyAdjusted, getPortalAdminEmails } from '@/lib/email'
import { translateGiftRequests } from '@/lib/translate'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getFamilyByToken(token: string) {
  const { data } = await adminClient()
    .from('families')
    .select('id, status, guardian_name, family_number, language_pref, social_worker_id, social_workers(name, email)')
    .eq('link_token', token)
    .single()
  return data
}

async function sendAuditEmails(
  family: NonNullable<Awaited<ReturnType<typeof getFamilyByToken>>>,
  changes: string[],
) {
  const sw = Array.isArray(family.social_workers) ? family.social_workers[0] : family.social_workers
  if (!sw?.email) return

  const familyName = family.guardian_name ?? `Family #${family.family_number}`
  const familyRef = `#${family.family_number}`
  const admin = adminClient()

  await admin.from('family_change_log').insert({
    family_id: family.id,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const family = await getFamilyByToken(token)
  if (!family) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (family.status === 'approved') return NextResponse.json({ error: 'Already approved' }, { status: 403 })

  const { firstName, age, gender, giftRequests, topSize, bottomSize, shoeSize } = await request.json()
  if (!firstName?.trim()) return NextResponse.json({ error: 'First name required' }, { status: 400 })

  // Auto-translate gift requests for Spanish-speaking families
  let giftRequestsEn: string | null = null
  let translationStatus: string | null = null
  if (giftRequests && family.language_pref === 'es') {
    try {
      giftRequestsEn = await translateGiftRequests(giftRequests)
      translationStatus = 'pending_review'
    } catch {
      // Translation failure is non-fatal; SW can translate manually
    }
  }

  const { data, error } = await adminClient()
    .from('children')
    .insert({
      family_id: family.id,
      first_name: firstName,
      age: age ? Number(age) : null,
      gender: gender || null,
      gift_requests: giftRequests || null,
      gift_requests_en: giftRequestsEn,
      translation_status: translationStatus,
      top_size: topSize || null,
      bottom_size: bottomSize || null,
      shoe_size: shoeSize || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (['submitted', 'approved'].includes(family.status)) {
    const ageLabel = age ? `, age ${age}` : ''
    await sendAuditEmails(family, [`Child added: ${firstName}${ageLabel}`])
  }

  return NextResponse.json({ child: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const family = await getFamilyByToken(token)
  if (!family) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (family.status === 'approved') return NextResponse.json({ error: 'Already approved' }, { status: 403 })

  const { id } = await request.json()

  // Fetch child details before deleting for the audit log
  const { data: child } = await adminClient()
    .from('children')
    .select('first_name, age')
    .eq('id', id)
    .eq('family_id', family.id)
    .maybeSingle()

  const { error } = await adminClient()
    .from('children')
    .delete()
    .eq('id', id)
    .eq('family_id', family.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (child && ['submitted', 'approved'].includes(family.status)) {
    const ageLabel = child.age ? `, age ${child.age}` : ''
    await sendAuditEmails(family, [`Child removed: ${child.first_name}${ageLabel}`])
  }

  return NextResponse.json({ ok: true })
}
