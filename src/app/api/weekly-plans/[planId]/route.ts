import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateWeeklyPlan, deleteWeeklyPlan } from '@/lib/db/realisation-docs'
import { weeklyPlanUpdateSchema } from '@/lib/validation/project-docs'

type RouteParams = { params: Promise<{ planId: string }> }
const ALLOWED = ['admin', 'direction', 'realisation_chef', 'realisation_team']

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  const { planId } = await params
  const parsed = weeklyPlanUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  const body = parsed.data
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
