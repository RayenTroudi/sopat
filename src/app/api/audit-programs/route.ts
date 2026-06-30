import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listAuditPrograms,
  createAuditProgram,
  type NcDept,
  type AuditProgramStatus,
} from '@/lib/db/iso'
import { z } from 'zod'

const createSchema = z.object({
  dept:               z.enum(['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH'] as const),
  title:              z.string().optional(),
  auditorName:        z.string().optional(),
  auditeeResponsible: z.string().optional(),
  scheduledDate:      z.string().datetime().optional(),
  actualDate:         z.string().datetime().optional(),
  status:             z.enum(['planifie', 'en_cours', 'realise', 'reporte', 'annule'] as const).optional(),
  scope:              z.string().optional(),
  objectives:         z.string().optional(),
  criteria:           z.string().optional(),
  findings:           z.string().optional(),
  reportAssetId:      z.string().uuid().optional(),
  notes:              z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const rows = await listAuditPrograms({
    year:   sp.get('year')   ? Number(sp.get('year'))   : undefined,
    dept:   (sp.get('dept')  as NcDept | null)          ?? undefined,
    status: (sp.get('status') as AuditProgramStatus | null) ?? undefined,
  })

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const isQualityOrAdmin = ['admin', 'direction', 'qualite_manager', 'qualite_agent'].includes(session.user.role)
  if (!isQualityOrAdmin) {
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const program = await createAuditProgram({
    dept:               d.dept,
    title:              d.title,
    auditorName:        d.auditorName,
    auditeeResponsible: d.auditeeResponsible,
    scheduledDate:      d.scheduledDate ? new Date(d.scheduledDate) : undefined,
    actualDate:         d.actualDate    ? new Date(d.actualDate)    : undefined,
    status:             d.status,
    scope:              d.scope,
    objectives:         d.objectives,
    criteria:           d.criteria,
    findings:           d.findings,
    reportAssetId:      d.reportAssetId,
    notes:              d.notes,
    createdBy:          session.user.userId,
  })

  return NextResponse.json(program, { status: 201 })
}
