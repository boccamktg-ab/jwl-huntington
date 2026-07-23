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
