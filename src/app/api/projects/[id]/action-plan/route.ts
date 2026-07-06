import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getActionPlanItems, upsertActionPlanItems } from '@/lib/db/realisation'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const itemSchema = z.object({
  phaseCode:        z.string().min(1).max(50),
  phaseLabel:       z.string().min(1).max(500),
  plannedStartDate: z.string().optional(),
  plannedEndDate:   z.string().optional(),
  actualStartDate:  z.string().optional(),
  actualEndDate:    z.string().optional(),
  progressPct:      z.number().int().min(0).max(100).optional(),
  observations:     z.string().max(2000).optional(),
  sortOrder:        z.number().int().optional(),
  isPhaseHeader:    z.boolean().optional(),
})

const saveSchema = z.object({
  items: z.array(itemSchema),
})

const ALLOWED_ROLES = ['admin', 'direction', 'realisation_chef', 'etudes_chef']

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const items = await getActionPlanItems(id)
  return NextResponse.json(items)
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const items = await upsertActionPlanItems(id, parsed.data.items, session.user.userId)
  return NextResponse.json(items)
}
