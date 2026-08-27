import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getWeeklyPlans, createWeeklyPlan } from '@/lib/db/realisation-docs'
import { weeklyPlanCreateSchema } from '@/lib/validation/project-docs'

const ALLOWED = ['admin', 'direction', 'realisation_chef', 'realisation_team']

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  return NextResponse.json(await getWeeklyPlans())
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  const parsed = weeklyPlanCreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  const body = parsed.data
  const row = await createWeeklyPlan(body, session.user.userId)
  return NextResponse.json(row, { status: 201 })
}
