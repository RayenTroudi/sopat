import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { listPortfolioExports } from '@/lib/db/portfolio'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!hasFullAccess(session.user.role)) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }
  const rows = await listPortfolioExports()
  return NextResponse.json(rows)
}
