import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateSignedUploadParams } from '@/lib/cloudinary'
import { saveAssetRecord } from '@/lib/db/etudes'
import { assertProjectAccess } from '@/lib/db/projects'
import { z } from 'zod'

// GET — returns signed Cloudinary upload params
// Expects ?projectId=<uuid> so we can verify access before handing out a signature
const signSchema = z.object({
  projectId: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const parsed = signSchema.safeParse({ projectId: req.nextUrl.searchParams.get('projectId') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètre projectId (UUID) requis' }, { status: 400 })
  }

  const access = await assertProjectAccess(parsed.data.projectId, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const folder = `sopat-admin/${parsed.data.projectId}`
  const params = generateSignedUploadParams(folder)
  return NextResponse.json(params)
}

const recordSchema = z.object({
  publicId: z.string(),
  url: z.string().url(),
  secureUrl: z.string().url(),
  assetType: z.enum(['render_3d', 'plan_autocad', 'specification', 'reception_document', 'site_photo', 'invoice', 'contract', 'other']),
  format: z.string().optional(),
  bytes: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  projectId: z.string().uuid(),
})

// POST — called after client-side upload completes, records the asset in DB
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = recordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  // Verify the user can write to this project before recording the asset
  const access = await assertProjectAccess(parsed.data.projectId, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  try {
    const asset = await saveAssetRecord({
      ...parsed.data,
      uploadedBy: session.user.userId,
    })
    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
