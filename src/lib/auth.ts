import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { UserRole } from '@/lib/auth-utils'

const COOKIE = 'sopat_admin'

export type AdminSession = {
  user: {
    userId: string
    role: UserRole
    name: string | null
    email: string | null
    image: string | null
  }
}

function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET
  if (!raw || raw.length < 32) {
    throw new Error('ADMIN_JWT_SECRET must be set in .env and be at least 32 characters')
  }
  return new TextEncoder().encode(raw)
}

export async function signAdminToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function getAdminSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return false
  return verifyAdminToken(token)
}

// Compatibility shim for code that previously used NextAuth's auth().
// Returns a minimal session object when the admin cookie is valid, or null.
export async function auth(): Promise<AdminSession | null> {
  const ok = await getAdminSession()
  if (!ok) return null
  return {
    user: {
      userId: 'admin',
      role: 'admin' as UserRole,
      name: 'Admin',
      email: null,
      image: null,
    },
  }
}

export async function signOut(_opts?: { redirectTo?: string }) {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export { COOKIE as ADMIN_COOKIE }
