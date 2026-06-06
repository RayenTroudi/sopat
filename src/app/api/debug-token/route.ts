import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('__Secure-authjs.session-token'))
    ?.trim()

  let token = null
  let error = null

  try {
    token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: true,
      cookieName: '__Secure-authjs.session-token',
    })
  } catch (e) {
    error = String(e)
  }

  return NextResponse.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length,
    hasCookie: !!sessionCookie,
    cookiePrefix: sessionCookie?.substring(0, 60),
    tokenDecoded: token ? { email: (token as { email?: string }).email, role: (token as { role?: string }).role } : null,
    error,
  })
}
