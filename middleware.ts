import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware only handles the login-page redirect when already authenticated.
// All other auth enforcement is done server-side in the dashboard layout via
// `await auth()` (Node.js runtime, can decrypt the JWT correctly).
// We cannot reliably decrypt NextAuth v5 JWTs in the Vercel edge runtime.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only the login page needs a middleware check (prevent authenticated users
  // from seeing the login form). All other /admin/* protection is in the layout.
  if (pathname === '/admin/login') {
    const sessionCookie =
      req.cookies.get('__Secure-authjs.session-token')?.value ||
      req.cookies.get('authjs.session-token')?.value

    // If a session cookie exists, optimistically redirect to admin.
    // The layout will re-validate and redirect back to login if the token is actually invalid.
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/login'],
}
