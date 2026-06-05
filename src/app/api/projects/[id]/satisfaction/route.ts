import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { getSatisfactionRecords, saveSatisfaction } from '@/lib/db/entretien'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  score:    z.number().int().min(1).max(5),
  comments: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const records = await getSatisfactionRecords(id)
  return NextResponse.json(records)
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

  const record = await saveSatisfaction({
    projectId:  id,
    score:      parsed.data.score,
    comments:   parsed.data.comments,
    recordedBy: session.user.userId,
    createdBy:  session.user.userId,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'entretien.satisfaction_recorded',
    newState:  { score: parsed.data.score },
  })

  return NextResponse.json(record, { status: 201 })
}
