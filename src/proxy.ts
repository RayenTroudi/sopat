import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_COOKIE = 'sopat_admin'

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const raw = process.env.ADMIN_JWT_SECRET
    if (!raw || raw.length < 32) return false
    const secret = new TextEncoder().encode(raw)
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login') &&
    !pathname.startsWith('/api/admin/auth')
  ) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    const valid = token ? await verifyAdminToken(token) : false

    if (!valid) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
