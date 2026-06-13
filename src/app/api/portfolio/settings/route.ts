import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPortfolioSettings, upsertPortfolioSettings } from '@/lib/db/portfolio'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const row = await getPortfolioSettings()
  return NextResponse.json(row)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }
  const patch = await req.json()
  const row = await upsertPortfolioSettings(patch, session.user.userId)
  return NextResponse.json(row)
}
