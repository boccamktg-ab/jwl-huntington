import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  // Public routes — no auth needed
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/family') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  ) {
    return supabaseResponse
  }

  // Protected routes — redirect to login with ?next= so they land back after sign-in
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/members/:path*',
    '/jjwl/dashboard/:path*',
    '/jjwl/events/:path*',
    '/jjwl/account/:path*',
    '/jjwl/pending/:path*',
    '/grants/reviewer/:path*',
    '/dashboard/:path*',
    '/portal/:path*',
  ],
}
