import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEventResults, upsertEventResults, publishEventResults, getRseEvent } from '@/lib/db/rse-events'
import { z } from 'zod'

const resultsSchema = z.object({
  action: z.literal('save').optional(),
  wasteCollectedKg: z.string().nullable().optional(),
  treesPlanted: z.number().int().nullable().optional(),
  participantsActual: z.number().int().nullable().optional(),
  beachLengthCleanedM: z.string().nullable().optional(),
  zonesTreated: z.number().int().nullable().optional(),
  mediaCoverage: z.boolean().optional(),
  pressArticlesCount: z.number().int().nullable().optional(),
  socialMediaReach: z.number().int().nullable().optional(),
  satisfactionScore: z.number().int().min(1).max(5).nullable().optional(),
  lessonsLearned: z.string().nullable().optional(),
  postEventReportCloudinaryId: z.string().uuid().nullable().optional(),
  photosAlbumCloudinaryIds: z.array(z.string()).optional(),
})

const publishSchema = z.object({
  action: z.literal('publish'),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const results = await getEventResults(id)
  return NextResponse.json(results)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = resultsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const results = await upsertEventResults(id, parsed.data, session.user.userId, session.user.userId)
  return NextResponse.json(results, { status: 201 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  if (body.action === 'publish') {
    const parsed = publishSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }
    await publishEventResults(id)
    return NextResponse.json({ ok: true })
  }

  const parsed = resultsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const results = await upsertEventResults(id, parsed.data, session.user.userId, session.user.userId)
  return NextResponse.json(results)
}
