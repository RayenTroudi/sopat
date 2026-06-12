import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getEventCommunicationPlan,
  upsertEventCommunicationPlan,
  updateCommunicationAction,
} from '@/lib/db/rse-events'
import { z } from 'zod'

const upsertSchema = z.object({
  actions: z.array(z.object({
    phase: z.enum(['avant', 'pendant', 'apres']),
    actionDescription: z.string().min(1),
    channel: z.enum(['reseaux_sociaux', 'email_interne', 'presse', 'affichage', 'autre']),
    responsibleId: z.string().uuid().nullable().optional(),
    status: z.enum(['planifie', 'publie', 'annule']).optional(),
    notes: z.string().nullable().optional(),
  })),
})

const patchSchema = z.object({
  actionId: z.string().uuid(),
  status: z.enum(['planifie', 'publie', 'annule']).optional(),
  publishedAt: z.string().nullable().optional(),
  assetCloudinaryId: z.string().uuid().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const plan = await getEventCommunicationPlan(id)
  return NextResponse.json(plan)
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
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const actions = await upsertEventCommunicationPlan(
    id,
    parsed.data.actions,
    session.user.userId
  )
  return NextResponse.json(actions)
}

export async function PATCH(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { actionId, status, publishedAt, assetCloudinaryId } = parsed.data
  const updated = await updateCommunicationAction(actionId, {
    status,
    publishedAt: publishedAt ? new Date(publishedAt) : publishedAt === null ? null : undefined,
    assetCloudinaryId: assetCloudinaryId ?? undefined,
  })
  return NextResponse.json(updated)
}
