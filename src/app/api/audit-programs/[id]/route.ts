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

const QUALITY_ROLES = ['admin', 'direction'] as const

const updateSchema = z.object({
  title:               z.string().optional().nullable(),
  auditorName:         z.string().optional().nullable(),
  auditeeResponsible:  z.string().optional().nullable(),
  scheduledDate:       z.string().datetime().optional().nullable(),
  scheduledStartTime:  z.string().max(10).optional().nullable(),
  scheduledEndTime:    z.string().max(10).optional().nullable(),
  actualDate:          z.string().datetime().optional().nullable(),
  auditorSignedAt:     z.string().datetime().optional().nullable(),
  status:              z.enum(['planifie', 'en_cours', 'realise', 'reporte', 'annule'] as const).optional(),
  scope:               z.string().optional().nullable(),
  objectives:          z.string().optional().nullable(),
  criteria:            z.string().optional().nullable(),
  referenceDocuments:  z.string().optional().nullable(),
  findings:            z.string().optional().nullable(),
  reportAssetId:       z.string().uuid().optional().nullable(),
  notes:               z.string().optional().nullable(),
  items: z.array(z.object({
    agendaStep:      z.string().min(1),
    clauseRef:       z.string().optional(),
    interlocuteurs:  z.string().optional(),
    response:        z.string().optional(),
    conformity:      z.string().optional(),
    evidence:        z.string().optional(),
    sortOrder:       z.number().int().optional(),
  })).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const { id } = await params
  const program = await getAuditProgramById(id)
  if (!program) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
  return NextResponse.json(program)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  const toDate = (v: string | null | undefined) =>
    v === undefined ? undefined : v === null ? null : new Date(v)

  await updateAuditProgram(id, {
    title:               d.title,
    auditorName:         d.auditorName,
    auditeeResponsible:  d.auditeeResponsible,
    scheduledDate:       toDate(d.scheduledDate),
    scheduledStartTime:  d.scheduledStartTime,
    scheduledEndTime:    d.scheduledEndTime,
    actualDate:          toDate(d.actualDate),
    auditorSignedAt:     toDate(d.auditorSignedAt),
    status:              d.status as AuditProgramStatus | undefined,
    scope:               d.scope,
    objectives:          d.objectives,
    criteria:            d.criteria,
    referenceDocuments:  d.referenceDocuments,
    findings:            d.findings,
    reportAssetId:       d.reportAssetId,
    notes:               d.notes,
  })

  if (d.items !== undefined)
    await upsertAuditProgramItems(id, d.items, session.user.userId)

  const updated = await getAuditProgramById(id)
  return NextResponse.json(updated)
}
