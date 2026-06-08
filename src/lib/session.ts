import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { SessionOptions } from 'iron-session'
import type { UserRole } from '@/lib/auth-utils'

export interface SessionData {
  isLoggedIn: boolean
  userId: string
  email: string
  name: string
  role: UserRole
}

function getPassword(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and be at least 32 characters')
  }
  return secret
}

function getOptions(): SessionOptions {
  return {
    cookieName: 'sopat_session',
    password: getPassword(),
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    },
  }
}

export async function getSession() {
  const jar = await cookies()
  return getIronSession<SessionData>(jar, getOptions())
}
