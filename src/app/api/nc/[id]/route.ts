import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getNcById,
  updateNcStatus,
  updateNcPhotos,
  updateNcFields,
  softDeleteNc,
  checkNcClosePrerequisites,
  assertNcWriteAccess,
  type NcStatus,
} from '@/lib/db/iso'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status:             z.enum(['open', 'in_progress', 'closed', 'verified'] as const).optional(),
  rootCause:          z.string().optional().nullable(),
  beforePhotoAssetId: z.string().uuid().optional(),
  afterPhotoAssetId:  z.string().uuid().optional(),
  // Field edits
  description:                z.string().min(5).optional(),
  ncType:                     z.string().optional().nullable(),
  ncSource:                   z.string().optional().nullable(),
  dept:                       z.string().optional().nullable(),
  ownerType:                  z.string().optional().nullable(),
  processAffected:            z.string().optional().nullable(),
  auditorName:                z.string().optional().nullable(),
  detectorName:               z.string().optional().nullable(),
  detectorEmail:              z.string().optional().nullable(),
  referenceDoc:               z.string().optional().nullable(),
  impact:                     z.string().optional().nullable(),
  immediateCorrection:        z.string().optional().nullable(),
  derogationAuth:             z.boolean().optional().nullable(),
  rebut:                      z.boolean().optional().nullable(),
  correctionResponsible:      z.string().optional().nullable(),
  correctionDeadlinePlanned:  z.string().datetime().optional().nullable(),
  correctionDeadlineActual:   z.string().datetime().optional().nullable(),
  correctionStatus:           z.string().optional().nullable(),
  evalDatePlanned:            z.string().datetime().optional().nullable(),
  evalDateActual:             z.string().datetime().optional().nullable(),
  clientResponse:             z.string().optional().nullable(),
  isRisk:                     z.boolean().optional().nullable(),
  isOpportunity:              z.boolean().optional().nullable(),
  needsSecondCapa:            z.boolean().optional().nullable(),
  assignedTo:                 z.string().uuid().optional().nullable(),
  deadline:                   z.string().datetime().optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!['admin', 'direction'].includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const { id } = await params
  const nc = await getNcById(id)
  if (!nc) return NextResponse.json({ error: 'NC introuvable' }, { status: 404 })
  return NextResponse.json(nc)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  // Authorization: only admin/direction, the detector, or the assignee may mutate
  const access = await assertNcWriteAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  }
  const { nc } = access

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const newStatus = parsed.data.status

  // ISO independence: the person who detected the NC cannot set it to 'verified'
  if (newStatus === 'verified' && session.user.userId === nc.detectedById) {
    return NextResponse.json(
      { error: 'La vérification doit être effectuée par un utilisateur différent du détecteur (ISO 9001 indépendance)' },
      { status: 403 }
    )
  }

  // Closing / verifying requires all CAPA prerequisites
  if (newStatus === 'closed' || newStatus === 'verified') {
    const check = await checkNcClosePrerequisites(id, session.user.userId)
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 422 })
    }
  }

  if (parsed.data.beforePhotoAssetId !== undefined || parsed.data.afterPhotoAssetId !== undefined) {
    await updateNcPhotos(id, {
      beforePhotoAssetId: parsed.data.beforePhotoAssetId,
      afterPhotoAssetId:  parsed.data.afterPhotoAssetId,
    })
  }

  // Editable fields (admin/direction only)
  const d = parsed.data
  const fieldEditKeys = ['description','ncType','ncSource','dept','ownerType','processAffected',
    'auditorName','detectorName','detectorEmail','referenceDoc','impact','immediateCorrection',
    'derogationAuth','rebut','correctionResponsible','correctionDeadlinePlanned',
    'correctionDeadlineActual','correctionStatus','evalDatePlanned','evalDateActual',
    'clientResponse','isRisk','isOpportunity','needsSecondCapa','assignedTo','deadline'] as const
  const hasFieldEdit = fieldEditKeys.some(k => d[k] !== undefined)

  if (hasFieldEdit) {
    const isAdminOrDirection = session.user.role === 'admin' || session.user.role === 'direction'
    if (!isAdminOrDirection) {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent modifier les champs de la NC' }, { status: 403 })
    }
    await updateNcFields(id, {
      ...(d.description             !== undefined && { description: d.description }),
      ...(d.ncType                  !== undefined && { ncType: d.ncType }),
      ...(d.ncSource                !== undefined && { ncSource: d.ncSource }),
      ...(d.dept                    !== undefined && { dept: d.dept }),
      ...(d.ownerType               !== undefined && { ownerType: d.ownerType }),
      ...(d.processAffected         !== undefined && { processAffected: d.processAffected }),
      ...(d.auditorName             !== undefined && { auditorName: d.auditorName }),
      ...(d.detectorName            !== undefined && { detectorName: d.detectorName }),
      ...(d.detectorEmail           !== undefined && { detectorEmail: d.detectorEmail }),
      ...(d.referenceDoc            !== undefined && { referenceDoc: d.referenceDoc }),
      ...(d.impact                  !== undefined && { impact: d.impact }),
      ...(d.immediateCorrection     !== undefined && { immediateCorrection: d.immediateCorrection }),
      ...(d.derogationAuth          !== undefined && { derogationAuth: d.derogationAuth }),
      ...(d.rebut                   !== undefined && { rebut: d.rebut }),
      ...(d.correctionResponsible   !== undefined && { correctionResponsible: d.correctionResponsible }),
      ...(d.correctionDeadlinePlanned !== undefined && { correctionDeadlinePlanned: d.correctionDeadlinePlanned ? new Date(d.correctionDeadlinePlanned) : null }),
      ...(d.correctionDeadlineActual  !== undefined && { correctionDeadlineActual:  d.correctionDeadlineActual  ? new Date(d.correctionDeadlineActual)  : null }),
      ...(d.correctionStatus        !== undefined && { correctionStatus: d.correctionStatus }),
      ...(d.evalDatePlanned         !== undefined && { evalDatePlanned: d.evalDatePlanned ? new Date(d.evalDatePlanned) : null }),
      ...(d.evalDateActual          !== undefined && { evalDateActual:  d.evalDateActual  ? new Date(d.evalDateActual)  : null }),
      ...(d.clientResponse          !== undefined && { clientResponse: d.clientResponse }),
      ...(d.isRisk                  !== undefined && { isRisk: d.isRisk }),
      ...(d.isOpportunity           !== undefined && { isOpportunity: d.isOpportunity }),
      ...(d.needsSecondCapa         !== undefined && { needsSecondCapa: d.needsSecondCapa }),
      ...(d.assignedTo              !== undefined && { assignedTo: d.assignedTo }),
      ...(d.deadline                !== undefined && { deadline: d.deadline ? new Date(d.deadline) : null }),
    })
  }

  if (newStatus !== undefined || d.rootCause !== undefined) {
    await updateNcStatus(
      id,
      (newStatus ?? nc.status) as NcStatus,
      session.user.userId,
      { rootCause: d.rootCause ?? undefined }
    )
  }

  const updated = await getNcById(id)
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const { id } = await params
  const ok = await softDeleteNc(id, session.user.userId)
  if (!ok) return NextResponse.json({ error: 'NC introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
