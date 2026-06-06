import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'
import { canAccessPath } from '@/lib/auth-utils'
import type { UserRole } from '@/lib/auth-utils'
import type { NextAuthRequest } from 'next-auth'

const { auth } = NextAuth(authConfig)

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (session) return NextResponse.redirect(new URL('/admin', req.url))
      return NextResponse.next()
    }

    if (!session) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const role = session.user.role as UserRole
    if (!canAccessPath(role, pathname)) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*'],
}
