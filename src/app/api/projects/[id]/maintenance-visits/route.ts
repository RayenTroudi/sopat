import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import {
  getScheduledVisits,
  createScheduledVisit,
  getVisitReports,
  getOrCreateDefaultSchedule,
  type VisitType,
} from '@/lib/db/entretien'
import { maybeSendMaintenanceReminder } from '@/lib/tasks/maintenance-reminders'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const scheduleSchema = z.object({
  visitDate:     z.string().datetime(),
  visitType:     z.enum(['taille','arrosage','traitement_phytosanitaire','fertilisation','controle_general','other'] as const),
  durationHours: z.string().optional(),
  teamMemberId:  z.string().uuid(),
  notes:         z.string().optional(),
})

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const mode = req.nextUrl.searchParams.get('mode')

  if (mode === 'reports') {
    const reports = await getVisitReports(id)
    return NextResponse.json(reports)
  }

  const visits = await getScheduledVisits(id)
  return NextResponse.json(visits)
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
  const parsed = scheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const schedule = await getOrCreateDefaultSchedule(id, session.user.userId)

  const visit = await createScheduledVisit({
    projectId:     id,
    scheduleId:    schedule.id,
    visitDate:     new Date(d.visitDate),
    visitType:     d.visitType as VisitType,
    durationHours: d.durationHours,
    teamMemberId:  d.teamMemberId,
    notes:         d.notes,
    createdBy:     session.user.userId,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'entretien.visit_scheduled',
    newState:  { visitDate: d.visitDate, visitType: d.visitType },
  })

  // Send reminder now if the visit is tomorrow (replaces cron)
  maybeSendMaintenanceReminder(visit.id).catch((e) =>
    console.error('[maintenance reminder]', e)
  )

  return NextResponse.json(visit, { status: 201 })
}
