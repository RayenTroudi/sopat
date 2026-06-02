import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE = 'sopat_admin'

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

export { COOKIE as ADMIN_COOKIE }
