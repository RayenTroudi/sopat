import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getNcById,
  updateNcStatus,
  updateNcPhotos,
  checkNcClosePrerequisites,
  assertNcWriteAccess,
  type NcStatus,
} from '@/lib/db/iso'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status:             z.enum(['open', 'in_progress', 'closed', 'verified'] as const).optional(),
  rootCause:          z.string().optional(),
  beforePhotoAssetId: z.string().uuid().optional(),
  afterPhotoAssetId:  z.string().uuid().optional(),
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

  await updateNcStatus(
    id,
    (newStatus ?? nc.status) as NcStatus,
    session.user.userId,
    { rootCause: parsed.data.rootCause }
  )

  const updated = await getNcById(id)
  return NextResponse.json(updated)
}
