import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAchievements, saveMetricsSnapshot } from '@/lib/db/achievements'

function isDirection(role: string) {
  return role === 'admin' || role === 'direction'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isDirection(session.user.role)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const url = new URL(req.url)
  const yf = url.searchParams.get('yearFrom')
  const yt = url.searchParams.get('yearTo')
  const yearFrom = yf ? Math.max(2000, Math.min(2100, parseInt(yf, 10))) : undefined
  const yearTo   = yt ? Math.max(2000, Math.min(2100, parseInt(yt, 10))) : undefined

  const data = await getAchievements({ yearFrom, yearTo })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  // Save a snapshot of the current metrics.
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isDirection(session.user.role)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const data = await getAchievements()
  const id = await saveMetricsSnapshot({ metrics: data, createdBy: session.user.userId })
  return NextResponse.json({ id, snapshotDate: new Date().toISOString().slice(0, 10) }, { status: 201 })
}
