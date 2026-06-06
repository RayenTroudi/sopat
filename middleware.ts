import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canAccessPath } from '@/lib/auth-utils'
import type { UserRole } from '@/lib/auth-utils'

export const runtime = 'nodejs'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: true,
    cookieName: '__Secure-authjs.session-token',
  })

  if (pathname === '/admin/login') {
    if (token) return NextResponse.redirect(new URL('/admin', req.url))
    return NextResponse.next()
  }

  if (!token) {
    const loginUrl = new URL('/admin/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as UserRole
  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
