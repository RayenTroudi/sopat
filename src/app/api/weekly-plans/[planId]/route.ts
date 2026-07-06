import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateWeeklyPlan, deleteWeeklyPlan } from '@/lib/db/realisation-docs'

type RouteParams = { params: Promise<{ planId: string }> }
const ALLOWED = ['admin', 'direction', 'realisation_chef', 'realisation_team']

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  const { planId } = await params
  const body = await req.json() as Parameters<typeof updateWeeklyPlan>[1]
  const row = await updateWeeklyPlan(planId, body)
  if (!row) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  const { planId } = await params
  await deleteWeeklyPlan(planId)
  return NextResponse.json({ ok: true })
}
