import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import {
  createCapa,
  updateCapa,
  assertNcWriteAccess,
  getCapaById,
} from '@/lib/db/iso'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const createSchema = z.object({
  actionDescription: z.string().min(10),
  responsibleId:     z.string().uuid(),
  deadline:          z.string().datetime().optional(),
  notes:             z.string().optional(),
})

const updateSchema = z.object({
  capaId:                z.string().uuid(),
  actionDescription:     z.string().optional(),
  status:                z.enum(['open', 'in_progress', 'closed'] as const).optional(),
  evidenceAssetId:       z.string().uuid().optional(),
  effectivenessVerified: z.boolean().optional(),
  notes:                 z.string().optional(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  // Authorization gate — also loads NC (needed for detector ID check below)
  const access = await assertNcWriteAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  }
  const { nc } = access

  const body = await req.json()

  // ── Update path ─────────────────────────────────────────────────────────────
  if (body.capaId) {
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data

    // IDOR: verify the CAPA actually belongs to this NC
    const capa = await getCapaById(d.capaId)
    if (!capa || capa.ncId !== id) {
      return NextResponse.json({ error: 'Action corrective introuvable' }, { status: 404 })
    }

    // Additional write guard: admin/direction, NC detector/assignee, or CAPA responsible
    const isAdminOrDirection = session.user.role === 'admin' || session.user.role === 'direction'
    const isNcParty = session.user.userId === nc.detectedById || session.user.userId === nc.assignedToId
    const isCapaResponsible = session.user.userId === capa.responsibleId
    if (!isAdminOrDirection && !isNcParty && !isCapaResponsible) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // ISO independence: the NC detector cannot self-verify effectiveness
    if (d.effectivenessVerified && session.user.userId === nc.detectedById) {
      return NextResponse.json(
        { error: 'La vérification d\'efficacité doit être effectuée par un utilisateur différent du détecteur (ISO 9001)' },
        { status: 403 }
      )
    }

    const updated = await updateCapa(d.capaId, {
      actionDescription:     d.actionDescription,
      status:                d.status,
      evidenceAssetId:       d.evidenceAssetId,
      effectivenessVerified: d.effectivenessVerified,
      verifiedBy:            d.effectivenessVerified ? session.user.userId : undefined,
      notes:                 d.notes,
    })
    return NextResponse.json(updated)
  }

  // ── Create path ─────────────────────────────────────────────────────────────
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const capa = await createCapa({
    ncId:              id,
    actionDescription: d.actionDescription,
    responsibleId:     d.responsibleId,
    deadline:          d.deadline ? new Date(d.deadline) : undefined,
    notes:             d.notes,
    createdBy:         session.user.userId,
  })

  return NextResponse.json(capa, { status: 201 })
}
