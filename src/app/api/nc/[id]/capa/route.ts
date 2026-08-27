import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  createCapa,
  updateCapa,
  softDeleteCapa,
  assertNcWriteAccess,
  getCapaById,
} from '@/lib/db/iso'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

// FOR-MI-05 names a responsible role ("RMI", "DG", "Equipe réalisation et
// entretien") that frequently has no platform account, and uses planning
// expressions where a date is expected. Either an account or a name is required.
const createSchema = z.object({
  actionDescription:   z.string().min(10),
  responsibleId:       z.string().uuid().optional(),
  responsibleName:     z.string().min(1).max(200).optional(),
  deadline:            z.string().datetime().optional(),
  deadlinePlanned:     z.string().datetime().optional(),
  deadlineActual:      z.string().datetime().optional(),
  deadlinePlannedText: z.string().max(200).optional(),
  deadlineActualText:  z.string().max(200).optional(),
  evalDatePlanned:     z.string().datetime().optional(),
  evalDateActual:      z.string().datetime().optional(),
  evalDatePlannedText: z.string().max(200).optional(),
  evalDateActualText:  z.string().max(200).optional(),
  progressStatus:      z.string().max(50).optional(),
  notes:               z.string().optional(),
}).refine(
  (d) => Boolean(d.responsibleId) || Boolean(d.responsibleName?.trim()),
  { message: 'Un responsable (compte ou nom) est requis', path: ['responsibleId'] }
)

const updateSchema = z.object({
  capaId:                z.string().uuid(),
  actionDescription:     z.string().optional(),
  responsibleId:         z.string().uuid().optional().nullable(),
  responsibleName:       z.string().max(200).optional().nullable(),
  deadlinePlanned:       z.string().datetime().optional().nullable(),
  deadlineActual:        z.string().datetime().optional().nullable(),
  deadlinePlannedText:   z.string().max(200).optional().nullable(),
  deadlineActualText:    z.string().max(200).optional().nullable(),
  evalDatePlanned:       z.string().datetime().optional().nullable(),
  evalDateActual:        z.string().datetime().optional().nullable(),
  evalDatePlannedText:   z.string().max(200).optional().nullable(),
  evalDateActualText:    z.string().max(200).optional().nullable(),
  progressStatus:        z.string().max(50).optional().nullable(),
  status:                z.enum(['open', 'in_progress', 'closed'] as const).optional(),
  evidenceAssetId:       z.string().uuid().optional(),
  effectivenessVerified: z.boolean().optional(),
  notes:                 z.string().optional(),
})

const toDate = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null ? null : new Date(v)

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
      responsibleId:         d.responsibleId,
      responsibleName:       d.responsibleName,
      deadlinePlanned:       toDate(d.deadlinePlanned),
      deadlineActual:        toDate(d.deadlineActual),
      deadlinePlannedText:   d.deadlinePlannedText,
      deadlineActualText:    d.deadlineActualText,
      evalDatePlanned:       toDate(d.evalDatePlanned),
      evalDateActual:        toDate(d.evalDateActual),
      evalDatePlannedText:   d.evalDatePlannedText,
      evalDateActualText:    d.evalDateActualText,
      progressStatus:        d.progressStatus,
      status:                d.status,
      evidenceAssetId:       d.evidenceAssetId,
      effectivenessVerified: d.effectivenessVerified,
      verifiedBy:            d.effectivenessVerified ? session.user.userId : undefined,
      notes:                 d.notes,
    }, session.user)
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
    responsibleId:     d.responsibleId ?? null,
    responsibleName:   d.responsibleName,
    deadline:          d.deadline ? new Date(d.deadline) : undefined,
    deadlinePlanned:   d.deadlinePlanned ? new Date(d.deadlinePlanned) : undefined,
    deadlineActual:    d.deadlineActual  ? new Date(d.deadlineActual)  : undefined,
    deadlinePlannedText: d.deadlinePlannedText,
    deadlineActualText:  d.deadlineActualText,
    evalDatePlanned:   d.evalDatePlanned ? new Date(d.evalDatePlanned) : undefined,
    evalDateActual:    d.evalDateActual  ? new Date(d.evalDateActual)  : undefined,
    evalDatePlannedText: d.evalDatePlannedText,
    evalDateActualText:  d.evalDateActualText,
    progressStatus:    d.progressStatus,
    notes:             d.notes,
    createdBy:         session.user.userId,
    actor:             session.user,
  })

  return NextResponse.json(capa, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const capaId = searchParams.get('capaId')
  if (!capaId) return NextResponse.json({ error: 'capaId requis' }, { status: 400 })

  // Verify NC + access
  const access = await assertNcWriteAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  // Verify ownership (admin/direction only)
  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Seuls les administrateurs peuvent supprimer une CAPA' }, { status: 403 })
  }

  const capa = await getCapaById(capaId)
  if (!capa || capa.ncId !== id) {
    return NextResponse.json({ error: 'Action corrective introuvable' }, { status: 404 })
  }

  const ok = await softDeleteCapa(capaId, id, session.user.userId, session.user)
  if (!ok) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
