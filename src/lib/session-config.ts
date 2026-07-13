// src/lib/session-config.ts
// Session shape + iron-session options, shared between server code
// (src/lib/session.ts) and the Edge middleware. Must stay edge-safe:
// no imports from next/headers or Node-only modules.

import type { SessionOptions } from 'iron-session'
import type { UserRole } from '@/lib/auth-utils'

export interface SessionData {
  isLoggedIn: boolean
  userId: string
  email: string
  name: string
  role: UserRole
}

export function getSessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and be at least 32 characters')
  }
  return {
    cookieName: 'sopat_session',
    password: secret,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    },
  }
}
