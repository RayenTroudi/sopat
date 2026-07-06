import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getChantierDailyLogs, createDailyLog } from '@/lib/db/realisation'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const participantSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
})

const createSchema = z.object({
  logDate:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayNumber:          z.number().int().positive().optional(),
  totalProgress:      z.number().min(0).max(100).optional(),
  worksDoneToday:     z.string().max(5000).optional(),
  supplies:           z.string().max(2000).optional(),
  anomalies:          z.string().max(2000).optional(),
  participants:       z.array(participantSchema).optional(),
  otherIntervenants:  z.string().max(1000).optional(),
  remarks:            z.string().max(2000).optional(),
  nextDayAgenda:      z.string().max(2000).optional(),
  chefProjet:         z.string().max(255).optional(),
})

const ALLOWED_ROLES = ['admin', 'direction', 'realisation_chef', 'realisation_team']

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const logs = await getChantierDailyLogs(id)
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const log = await createDailyLog(id, parsed.data, session.user.userId)
  return NextResponse.json(log, { status: 201 })
}
