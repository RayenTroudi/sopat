import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'

export async function GET() {
  const session = await getAuthSession()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { userId, email, name, role } = session
  return NextResponse.json({ userId, email, name, role })
}
