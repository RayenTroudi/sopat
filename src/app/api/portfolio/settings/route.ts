import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPortfolioSettings, upsertPortfolioSettings } from '@/lib/db/portfolio'
import { portfolioSettingsSchema } from '@/lib/validation/project-docs'

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
  const parsed = portfolioSettingsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  const patch = parsed.data
  const row = await upsertPortfolioSettings(patch, session.user.userId)
  return NextResponse.json(row)
}
