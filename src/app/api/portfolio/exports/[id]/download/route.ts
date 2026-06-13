import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { getPortfolioExport, incrementDownload } from '@/lib/db/portfolio'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!hasFullAccess(session.user.role)) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }
  const { id } = await params
  const row = await getPortfolioExport(id)
  if (!row?.assetUrl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await incrementDownload(id)
  return NextResponse.redirect(row.assetUrl, 302)
}
