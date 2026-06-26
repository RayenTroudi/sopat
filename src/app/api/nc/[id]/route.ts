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
  // Field edits (non-status)
  description:        z.string().min(5).optional(),
  ncType:             z.string().optional().nullable(),
  ownerType:          z.string().optional().nullable(),
  processAffected:    z.string().optional().nullable(),
  auditorName:        z.string().optional().nullable(),
  assignedTo:         z.string().uuid().optional().nullable(),
  deadline:           z.string().datetime().optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

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
  if (d.description !== undefined || d.ncType !== undefined || d.ownerType !== undefined ||
      d.processAffected !== undefined || d.auditorName !== undefined || d.assignedTo !== undefined ||
      d.deadline !== undefined) {
    const isAdminOrDirection = session.user.role === 'admin' || session.user.role === 'direction'
    if (!isAdminOrDirection) {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent modifier les champs de la NC' }, { status: 403 })
    }
    await updateNcFields(id, {
      ...(d.description     !== undefined && { description: d.description }),
      ...(d.ncType          !== undefined && { ncType: d.ncType }),
      ...(d.ownerType       !== undefined && { ownerType: d.ownerType }),
      ...(d.processAffected !== undefined && { processAffected: d.processAffected }),
      ...(d.auditorName     !== undefined && { auditorName: d.auditorName }),
      ...(d.assignedTo      !== undefined && { assignedTo: d.assignedTo }),
      ...(d.deadline        !== undefined && { deadline: d.deadline ? new Date(d.deadline) : null }),
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
  const ok = await softDeleteNc(id)
  if (!ok) return NextResponse.json({ error: 'NC introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
