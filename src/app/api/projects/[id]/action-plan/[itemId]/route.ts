import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { updateActionPlanItem } from '@/lib/db/realisation'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string; itemId: string }> }

const patchSchema = z.object({
  plannedStartDate: z.string().optional(),
  plannedEndDate:   z.string().optional(),
  actualStartDate:  z.string().optional(),
  actualEndDate:    z.string().optional(),
  progressPct:      z.number().int().min(0).max(100).optional(),
  observations:     z.string().max(2000).optional(),
})

const ALLOWED_ROLES = ['admin', 'direction', 'realisation_chef', 'realisation_team', 'etudes_chef']

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, itemId } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const row = await updateActionPlanItem(itemId, id, parsed.data)
  if (!row) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
  return NextResponse.json(row)
}
