import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireJJWLAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSuperAdminEmail(user.email)) return user
  const { data: member } = await db()
    .from('jwl_members')
    .select('is_admin, is_jjwl_admin, status')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (member?.is_admin || (member?.is_jjwl_admin && member?.status === 'approved')) return user
  return null
}

function esc(v: string | null | undefined) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const user = await requireJJWLAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = db()

  const { data: members } = await admin
    .from('jjwl_members')
    .select('name, email, phone, grade, status, membership_paid, parent_name, parent_phone, parent_email, created_at, schools(name)')
    .order('name', { ascending: true })

  const header = 'Name,Email,Phone,Grade,School,Status,Dues Paid,Parent Name,Parent Phone,Parent Email,Registered'
  const rows = (members ?? []).map((m: any) => {
    const school = Array.isArray(m.schools) ? m.schools[0] : m.schools
    return [
      esc(m.name),
      esc(m.email),
      esc(m.phone),
      esc(m.grade ? `Grade ${m.grade}` : ''),
      esc(school?.name),
      esc(m.status),
      esc(m.membership_paid ? 'Yes' : 'No'),
      esc(m.parent_name),
      esc(m.parent_phone),
      esc(m.parent_email),
      esc(new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="jjwl-members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
