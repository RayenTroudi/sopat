import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { getSitePhotoCheckpoints, SITE_PHOTO_MILESTONES, buildMilestoneLinkedEntity } from '@/lib/db/realisation'
import { db } from '../../../../../../db/index'
import { cloudinaryAssets } from '../../../../../../db/schema'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const milestoneKeys = SITE_PHOTO_MILESTONES.map((m) => m.key) as [string, ...string[]]

const schema = z.object({
  milestone:  z.enum(milestoneKeys),
  publicId:   z.string().min(1),
  url:        z.string().url(),
  secureUrl:  z.string().url(),
  format:     z.string().optional(),
  bytes:      z.number().optional(),
  width:      z.number().optional(),
  height:     z.number().optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const checkpoints = await getSitePhotoCheckpoints(id)
  return NextResponse.json(checkpoints)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  const [asset] = await db
    .insert(cloudinaryAssets)
    .values({
      publicId:      d.publicId,
      url:           d.url,
      secureUrl:     d.secureUrl,
      assetType:     'site_photo',
      format:        d.format,
      bytes:         d.bytes,
      width:         d.width,
      height:        d.height,
      linkedEntity:  buildMilestoneLinkedEntity(d.milestone),
      projectId:     id,
      uploadedBy:    session.user.userId,
      createdBy:     session.user.userId,
    })
    .returning()

  const milestone = SITE_PHOTO_MILESTONES.find((m) => m.key === d.milestone)

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'realisation.site_photo_uploaded',
    newState:  { milestone: d.milestone, label: milestone?.label },
  })

  return NextResponse.json(asset, { status: 201 })
}
