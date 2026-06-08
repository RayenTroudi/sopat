import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateSignedUploadParams } from '@/lib/cloudinary'
import { db } from '../../../../../db/index'
import { rsePartnerships, cloudinaryAssets } from '../../../../../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const signSchema = z.object({
  partnershipId: z.string().uuid(),
  assetType: z.enum(['rse_convention', 'rse_communication']).optional(),
})

// GET — returns signed Cloudinary upload params for RSE assets
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const parsed = signSchema.safeParse({
    partnershipId: req.nextUrl.searchParams.get('partnershipId'),
    assetType: req.nextUrl.searchParams.get('assetType') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètre partnershipId (UUID) requis' }, { status: 400 })
  }

  const [partnership] = await db
    .select({ id: rsePartnerships.id })
    .from(rsePartnerships)
    .where(eq(rsePartnerships.id, parsed.data.partnershipId))
    .limit(1)

  if (!partnership) return NextResponse.json({ error: 'Partenariat non trouvé' }, { status: 404 })

  const folder = `sopat-admin/rse-partnerships/${parsed.data.partnershipId}`
  const params = generateSignedUploadParams(folder)
  return NextResponse.json(params)
}

const recordSchema = z.object({
  publicId: z.string(),
  url: z.string().url(),
  secureUrl: z.string().url(),
  assetType: z.enum(['rse_convention', 'rse_communication']),
  format: z.string().optional(),
  bytes: z.number().optional(),
  partnershipId: z.string().uuid(),
  linkedEntityId: z.string().uuid().optional(),
})

// POST — records the asset in DB after client-side Cloudinary upload
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = recordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  const [partnership] = await db
    .select({ id: rsePartnerships.id })
    .from(rsePartnerships)
    .where(eq(rsePartnerships.id, d.partnershipId))
    .limit(1)

  if (!partnership) return NextResponse.json({ error: 'Partenariat non trouvé' }, { status: 404 })

  const [asset] = await db
    .insert(cloudinaryAssets)
    .values({
      publicId: d.publicId,
      url: d.url,
      secureUrl: d.secureUrl,
      assetType: d.assetType,
      format: d.format ?? null,
      bytes: d.bytes ?? null,
      linkedEntity: 'rse_partnership',
      linkedEntityId: d.linkedEntityId ?? d.partnershipId,
      uploadedBy: session.user.userId,
      createdBy: session.user.userId,
    })
    .returning()

  return NextResponse.json(asset, { status: 201 })
}
