import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getAuditProgramById,
  updateAuditProgram,
  upsertAuditProgramItems,
  type AuditProgramStatus,
} from '@/lib/db/iso'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  title:              z.string().optional().nullable(),
  auditorName:        z.string().optional().nullable(),
  auditeeResponsible: z.string().optional().nullable(),
  scheduledDate:      z.string().datetime().optional().nullable(),
  actualDate:         z.string().datetime().optional().nullable(),
  status:             z.enum(['planifie', 'en_cours', 'realise', 'reporte', 'annule'] as const).optional(),
  scope:              z.string().optional().nullable(),
  objectives:         z.string().optional().nullable(),
  criteria:           z.string().optional().nullable(),
  findings:           z.string().optional().nullable(),
  reportAssetId:      z.string().uuid().optional().nullable(),
  notes:              z.string().optional().nullable(),
  items: z.array(z.object({
    id:          z.string().uuid().optional(),
    processCode: z.string().optional(),
    clauseRef:   z.string().optional(),
    question:    z.string().min(1),
    response:    z.string().optional(),
    conformity:  z.string().optional(),
    evidence:    z.string().optional(),
    sortOrder:   z.number().int().optional(),
  })).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const program = await getAuditProgramById(id)
  if (!program) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
  return NextResponse.json(program)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const isQualityOrAdmin = ['admin', 'direction', 'qualite_manager', 'qualite_agent'].includes(session.user.role)
  if (!isQualityOrAdmin) {
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  const scheduledDate = d.scheduledDate === undefined ? undefined
    : d.scheduledDate === null ? null
    : new Date(d.scheduledDate)
  const actualDate = d.actualDate === undefined ? undefined
    : d.actualDate === null ? null
    : new Date(d.actualDate)

  await updateAuditProgram(id, {
    title:              d.title,
    auditorName:        d.auditorName,
    auditeeResponsible: d.auditeeResponsible,
    scheduledDate,
    actualDate,
    status:             d.status as AuditProgramStatus | undefined,
    scope:              d.scope,
    objectives:         d.objectives,
    criteria:           d.criteria,
    findings:           d.findings,
    reportAssetId:      d.reportAssetId,
    notes:              d.notes,
  })

  if (d.items !== undefined) {
    await upsertAuditProgramItems(id, d.items, session.user.userId)
  }

  const updated = await getAuditProgramById(id)
  return NextResponse.json(updated)
}
