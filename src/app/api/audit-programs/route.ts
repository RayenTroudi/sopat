import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listAuditPrograms,
  createAuditProgram,
  checkAuditorAssignment,
  type NcDept,
  type AuditProgramStatus,
} from '@/lib/db/iso'
import { filterKnownClauseCodes, getProcessDefinition } from '@/lib/db/iso-reference'
import { z } from 'zod'

const QUALITY_ROLES = ['admin', 'direction'] as const

const DEPTS = ['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH'] as const

const createSchema = z.object({
  dept:                z.enum(DEPTS),
  title:               z.string().max(200).optional(),
  auditorName:         z.string().max(200).optional(),
  auditorId:           z.string().uuid().optional(),
  auditeeResponsible:  z.string().max(200).optional(),
  scheduledDate:       z.string().datetime().optional(),
  scheduledStartTime:  z.string().max(10).optional(),
  scheduledEndTime:    z.string().max(10).optional(),
  actualDate:          z.string().datetime().optional(),
  auditorSignedAt:     z.string().datetime().optional(),
  status:              z.enum(['planifie', 'en_cours', 'realise', 'reporte', 'annule'] as const).optional(),
  // Scope and objectives were collected by the form and then dropped on the way
  // out: neither was in this schema nor in the request body, so an auditor could
  // define the périmètre and the objectifs of an audit and have them silently
  // discarded. Both are ISO 9001 § 9.2.2 b) content of an audit programme.
  scope:               z.string().optional(),
  objectives:          z.string().optional(),
  /** Canonical ISO clause codes; validated against the register below. */
  clauseCodes:         z.array(z.string().max(10)).optional(),
  /** Legacy free-text criteria, accepted for compatibility with older clients. */
  criteria:            z.string().optional(),
  referenceDocuments:  z.string().optional(),
  findings:            z.string().optional(),
  reportAssetId:       z.string().uuid().optional(),
  notes:               z.string().optional(),
  /** Copy the process's reusable agenda into the new programme. Defaults to true. */
  seedFromTemplate:    z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const rows = await listAuditPrograms({
    year:   sp.get('year')    ? Number(sp.get('year'))              : undefined,
    dept:   (sp.get('dept')   as NcDept | null)                     ?? undefined,
    status: (sp.get('status') as AuditProgramStatus | null)         ?? undefined,
  })

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  // The process must exist in the cartography. It always will — dept is an enum
  // with a foreign key to qms_processes — but checking here turns a database
  // constraint violation into a readable message.
  const process = await getProcessDefinition(d.dept)
  if (!process)
    return NextResponse.json({ error: `Processus ${d.dept} introuvable dans la cartographie.` }, { status: 422 })

  // Clause scope: a submitted code that is not in the ISO register is rejected
  // rather than stored. Previously `criteria` was an unchecked string, so a typo
  // ("6,2", as in the source workbook) became the recorded audit criterion.
  let clauseCodes: string[] | undefined
  if (d.clauseCodes !== undefined) {
    clauseCodes = await filterKnownClauseCodes(d.clauseCodes)
    const unknown = d.clauseCodes.filter((c) => !clauseCodes!.includes(c.trim()))
    if (unknown.length > 0)
      return NextResponse.json(
        { error: `Clauses ISO inconnues : ${unknown.join(', ')}` },
        { status: 422 },
      )
  }
  // No fallback here on purpose: when nothing is supplied createAuditProgram
  // applies the process's own clause set, reference documents and time slot, so
  // every caller gets the same defaults rather than only this route.

  // ISO 9001 § 9.2.2 c) — objectivity and impartiality of the auditor.
  const auditorCheck = await checkAuditorAssignment({ auditorId: d.auditorId, dept: d.dept })
  if (auditorCheck.errors.length > 0)
    return NextResponse.json({ error: auditorCheck.errors.join(' ') }, { status: 422 })

  const program = await createAuditProgram({
    dept:                d.dept,
    title:               d.title,
    auditorName:         d.auditorName,
    auditorId:           d.auditorId,
    auditeeResponsible:  d.auditeeResponsible,
    scheduledDate:       d.scheduledDate      ? new Date(d.scheduledDate)      : undefined,
    scheduledStartTime:  d.scheduledStartTime,
    scheduledEndTime:    d.scheduledEndTime,
    actualDate:          d.actualDate         ? new Date(d.actualDate)         : undefined,
    auditorSignedAt:     d.auditorSignedAt    ? new Date(d.auditorSignedAt)    : undefined,
    status:              d.status,
    scope:               d.scope,
    objectives:          d.objectives,
    clauseCodes,
    criteria:            d.criteria,
    referenceDocuments:  d.referenceDocuments,
    findings:            d.findings,
    reportAssetId:       d.reportAssetId,
    notes:               d.notes,
    seedFromTemplate:    d.seedFromTemplate ?? true,
    createdBy:           session.user.userId,
  })

  // Warnings are returned rather than swallowed: the quality manager sees the
  // impartiality conflict they just accepted.
  return NextResponse.json({ ...program, warnings: auditorCheck.warnings }, { status: 201 })
}
