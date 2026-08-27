import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getAnnualPlans, upsertAnnualPlan } from '@/lib/db/entretien-plans'
import { annualPlanSchema } from '@/lib/validation/project-docs'

type RouteParams = { params: Promise<{ id: string }> }
const ALLOWED = ['admin', 'direction', 'entretien_chef', 'realisation_chef']

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  return NextResponse.json(await getAnnualPlans(id))
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  const parsed = annualPlanSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  const { annee, ...rest } = parsed.data
  const row = await upsertAnnualPlan(id, annee, rest, session.user.userId)
  return NextResponse.json(row)
}
