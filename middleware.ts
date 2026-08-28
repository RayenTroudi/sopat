import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { getSessionOptions, type SessionData } from '@/lib/session-config'
import { canAccessPath, roleHome } from '@/lib/auth-utils'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/admin')
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/validate') ||
    pathname.startsWith('/edit')

  // Read the sealed iron-session cookie — cryptographically verified, unlike
  // the legacy `sopat_auth` presence flag which could be forged client-side.
  const response = NextResponse.next()
  let session: SessionData | null = null
  try {
    const iron = await getIronSession<SessionData>(request, response, getSessionOptions())
    if (iron.isLoggedIn) session = iron
  } catch {
    session = null
  }

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based path enforcement (RBAC — single point of control)
  if (isProtected && session && !canAccessPath(session.role, pathname)) {
    return NextResponse.redirect(new URL(roleHome(session.role), request.url))
  }

  if (isAuthRoute && session && !pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL(roleHome(session.role), request.url))
  }

  return response
}

export const config = {
  // /api/webhooks/* est exclu : ces requêtes viennent d'un tiers (Recall.ai),
  // n'ont pas de cookie de session, et sont authentifiées par signature HMAC
  // dans la route elle-même. Les faire passer par la logique de session ne les
  // protégerait pas davantage et lirait un cookie inexistant à chaque appel.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.png$).*)'],
}
