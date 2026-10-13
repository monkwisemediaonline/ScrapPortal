import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/onboarding', '/sell', '/lots', '/deals', '/admin']

// Refreshes the Supabase session cookie and bounces signed-out users from member pages.
//
// This is only a first, cheap gate. It reads the session from the cookie (and renews it when
// it is about to expire) without calling the auth server, because it runs on every request,
// including the dozen-plus link preloads each page triggers. The real checks are not here:
// every page and server action loads the member through lib/auth.ts, where the database
// verifies the session token's signature before returning any row (row-level security).
export async function proxy(request: NextRequest) {
  // Lets the layout know which page is being rendered (see components/AppShell.tsx)
  request.headers.set('x-pathname', request.nextUrl.pathname)
  let response = NextResponse.next({ request })
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  if (!session && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
