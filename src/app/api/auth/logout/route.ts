import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST() {
  const session = await getSession()
  session.destroy()

  const response = NextResponse.json({ success: true })

  // Explicitly zero out both cookies so browsers drop them immediately
  response.cookies.set('sopat_auth', '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set('sopat_session', '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
