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

export const SESSION_OPTIONS: SessionOptions = {
  cookieName: 'sopat_session',
  // password is read lazily so we don't blow up at module-load time
  password: '',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
  },
}

export async function getSession() {
  const jar = await cookies()
  return getIronSession<SessionData>(jar, {
    ...SESSION_OPTIONS,
    password: getPassword(),
  })
}
