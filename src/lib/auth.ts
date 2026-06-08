import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import type { SessionData } from '@/lib/session'
import type { UserRole } from '@/lib/auth-utils'

export type { SessionData }

// ── Compatibility shim ────────────────────────────────────────────────────────
// All existing routes use `const session = await auth()` and then access
// `session.user.userId`, `session.user.role`, `session.user.name`.
// This re-exports auth() returning that same shape so no route files need changing.

export interface LegacySession {
  user: {
    userId: string
    role: UserRole
    name: string | null
    email: string | null
    image: string | null
  }
}

export async function auth(): Promise<LegacySession | null> {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return {
    user: {
      userId: session.userId,
      role: session.role,
      name: session.name,
      email: session.email,
      image: null,
    },
  }
}

// ── New helpers ───────────────────────────────────────────────────────────────

export async function getAuthSession(): Promise<SessionData | null> {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return {
    isLoggedIn: true,
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  }
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getAuthSession()
  if (!session) redirect('/login')
  return session
}

export async function requireRole(roles: UserRole[]): Promise<SessionData> {
  const session = await getAuthSession()
  if (!session) redirect('/login')
  if (!roles.includes(session.role)) redirect('/admin/dashboard')
  return session
}

// ── Legacy cookie cleanup ─────────────────────────────────────────────────────
// Kept for backward-compat; routes that imported these from the old auth.ts

export async function signOut(_opts?: { redirectTo?: string }) {
  const session = await getSession()
  session.destroy()
}

export const ADMIN_COOKIE = 'sopat_session'
