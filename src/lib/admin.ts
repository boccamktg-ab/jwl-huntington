import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function isSuperAdminEmail(email: string | undefined) {
  return email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

async function memberIsSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await db()
    .from('jwl_members')
    .select('is_super_admin')
    .eq('auth_id', userId)
    .eq('is_super_admin', true)
    .maybeSingle()
  return !!data
}

async function memberIsAdmin(userId: string): Promise<boolean> {
  const { data } = await db()
    .from('jwl_members')
    .select('is_admin, is_super_admin')
    .eq('auth_id', userId)
    .maybeSingle()
  return !!(data?.is_admin || data?.is_super_admin)
}

// For use in server components / layouts
export async function checkIsAdmin(userId: string, email: string | undefined): Promise<boolean> {
  if (isSuperAdminEmail(email)) return true
  return memberIsAdmin(userId)
}

export async function checkIsSuperAdmin(userId: string, email: string | undefined): Promise<boolean> {
  if (isSuperAdminEmail(email)) return true
  return memberIsSuperAdmin(userId)
}

async function memberIsGrantsReviewer(userId: string): Promise<boolean> {
  const { data } = await db()
    .from('jwl_members')
    .select('is_grants_reviewer, is_admin, is_super_admin, status')
    .eq('auth_id', userId)
    .maybeSingle()
  return !!(data?.status === 'approved' && (data?.is_grants_reviewer || data?.is_admin || data?.is_super_admin))
}

// For use in API route handlers (uses request cookies)
export async function requireAdminFromRequest(request: NextRequest): Promise<{ id: string; email: string | undefined } | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const ok = await checkIsAdmin(user.id, user.email)
  return ok ? { id: user.id, email: user.email } : null
}

// For use in JJWL admin API routes (uses session cookies, not request cookies)
export async function requireJJWLAdminUser(): Promise<{ id: string; email: string | undefined } | null> {
  const { createClient: serverClient } = await import('@/lib/supabase/server')
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSuperAdminEmail(user.email)) return { id: user.id, email: user.email }
  const { data: member } = await db()
    .from('jwl_members')
    .select('is_admin, is_super_admin, is_jjwl_admin, status')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (member?.is_admin || member?.is_super_admin || (member?.is_jjwl_admin && member?.status === 'approved')) {
    return { id: user.id, email: user.email }
  }
  return null
}

export async function requireGrantsReviewerFromRequest(request: NextRequest): Promise<{ id: string; email: string | undefined } | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSuperAdminEmail(user.email)) return { id: user.id, email: user.email }
  const ok = await memberIsGrantsReviewer(user.id)
  return ok ? { id: user.id, email: user.email } : null
}
