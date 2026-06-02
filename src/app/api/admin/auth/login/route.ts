import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { signAdminToken, ADMIN_COOKIE } from '@/lib/auth'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  // Buffers must be the same length for timingSafeEqual; pad to the longer one
  const len = Math.max(ab.length, bb.length)
  const aBuf = Buffer.concat([ab, Buffer.alloc(len - ab.length)])
  const bBuf = Buffer.concat([bb, Buffer.alloc(len - bb.length)])
  return timingSafeEqual(aBuf, bBuf) && ab.length === bb.length
}

export async function POST(request: NextRequest) {
  const validPassword = process.env.ADMIN_PASSWORD
  if (!validPassword) {
    return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 })
  }

  const { email, password } = await request.json()

  const validEmail = 'admin@sopat.tn'
  const emailOk = safeEqual(String(email ?? ''), validEmail)
  const passwordOk = safeEqual(String(password ?? ''), validPassword)

  if (!emailOk || !passwordOk) {
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signAdminToken()
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
