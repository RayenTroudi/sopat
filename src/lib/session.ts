import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session-config'

export type { SessionData }

export async function getSession() {
  const jar = await cookies()
  return getIronSession<SessionData>(jar, getSessionOptions())
}
