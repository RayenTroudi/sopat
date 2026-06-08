import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Edge runtime — no Node.js imports, no iron-session.
// We check for the lightweight "sopat_auth" presence cookie set on login.
// The actual session data (role, userId) is verified server-side per route
// via iron-session (Node runtime) in lib/auth.ts.

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/validate/',
  '/edit/',
  '/_next/',
  '/favicon.ico',
  '/icon.svg',
  '/logo',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const authCookie = req.cookies.get('sopat_auth')?.value

  if (!authCookie) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
