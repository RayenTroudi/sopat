import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { getProjectById, updateProject, softDeleteProject } from '@/lib/db/projects'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  siteAddress: z.string().optional(),
  siteAreaM2: z.string().optional(),
  projectType: z.enum(['residential', 'commercial', 'public']).optional(),
  startDate: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  assignedEtudesChefId: z.string().uuid().optional(),
  assignedRealisationChefId: z.string().uuid().optional(),
  assignedEntretienChefId: z.string().uuid().optional(),
  approvedBudget: z.string().optional(),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  try {
    const data = await getProjectById(id)
    if (!data) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/projects/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const { startDate, estimatedDeliveryDate, ...rest } = parsed.data
    const coerced = {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(estimatedDeliveryDate ? { estimatedDeliveryDate: new Date(estimatedDeliveryDate) } : {}),
    }
    const updated = await updateProject(
      id,
      coerced,
      session.user.userId,
      session.user.name ?? session.user.email ?? 'Inconnu'
    )
    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    const status = msg === 'Projet introuvable' ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  try {
    await softDeleteProject(
      id,
      session.user.userId,
      session.user.name ?? session.user.email ?? 'Inconnu'
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    const status = msg === 'Projet introuvable' ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
