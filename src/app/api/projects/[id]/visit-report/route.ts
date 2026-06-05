import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { saveVisitReport, getOrCreateDefaultSchedule, type VisitType, type HealthStatus } from '@/lib/db/entretien'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const healthZoneSchema = z.object({
  zoneName:      z.string().min(1),
  healthStatus:  z.enum(['healthy', 'attention', 'critical'] as const),
  healthScore:   z.number().int().min(1).max(5),
  observations:  z.string().optional(),
})

const productSchema = z.object({
  name:       z.string().min(1),
  quantity:   z.number().min(0),
  unit:       z.string().min(1),
  supplierId: z.string().uuid().optional(),
})

const reportSchema = z.object({
  visitId:                  z.string().uuid().optional(),
  visitDate:                z.string().datetime(),
  visitType:                z.enum(['taille','arrosage','traitement_phytosanitaire','fertilisation','controle_general','other'] as const),
  durationHours:            z.string().optional(),
  teamMemberId:             z.string().uuid(),
  workDone:                 z.string().min(1),
  workChecklist:            z.record(z.string(), z.boolean()),
  productsUsed:             z.array(productSchema).default([]),
  issuesFound:              z.string().optional(),
  nextVisitRecommendation:  z.string().optional(),
  beforePhotoAssetId:       z.string().uuid().optional(),
  afterPhotoAssetId:        z.string().uuid().optional(),
  healthZones:              z.array(healthZoneSchema).default([]),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json()
  const parsed = reportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const schedule = await getOrCreateDefaultSchedule(id, session.user.userId)

  const visitId = await saveVisitReport({
    visitId:                  d.visitId,
    projectId:                id,
    scheduleId:               schedule.id,
    visitDate:                new Date(d.visitDate),
    visitType:                d.visitType as VisitType,
    durationHours:            d.durationHours,
    teamMemberId:             d.teamMemberId,
    workDone:                 d.workDone,
    workChecklist:            d.workChecklist,
    productsUsed:             d.productsUsed,
    issuesFound:              d.issuesFound,
    nextVisitRecommendation:  d.nextVisitRecommendation,
    beforePhotoAssetId:       d.beforePhotoAssetId,
    afterPhotoAssetId:        d.afterPhotoAssetId,
    healthZones:              d.healthZones.map((z) => ({
      ...z,
      healthStatus: z.healthStatus as HealthStatus,
    })),
    createdBy: session.user.userId,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'entretien.visit_report_saved',
    newState:  { visitId, visitDate: d.visitDate, healthZoneCount: d.healthZones.length },
  })

  return NextResponse.json({ ok: true, visitId }, { status: 201 })
}
