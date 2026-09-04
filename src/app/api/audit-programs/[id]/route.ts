import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getAuditProgramById,
  updateAuditProgram,
  upsertAuditProgramItems,
  setAuditProgramClauses,
  checkAuditProgramScheduleChange,
  checkAuditorAssignment,
  type AuditProgramStatus,
  type NcDept,
} from '@/lib/db/iso'
import { filterKnownClauseCodes } from '@/lib/db/iso-reference'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const QUALITY_ROLES = ['admin', 'direction'] as const

const updateSchema = z.object({
  title:               z.string().max(200).optional().nullable(),
  auditorName:         z.string().max(200).optional().nullable(),
  auditorId:           z.string().uuid().optional().nullable(),
  auditeeResponsible:  z.string().max(200).optional().nullable(),
  scheduledDate:       z.string().datetime().optional().nullable(),
  scheduledStartTime:  z.string().max(10).optional().nullable(),
  scheduledEndTime:    z.string().max(10).optional().nullable(),
  actualDate:          z.string().datetime().optional().nullable(),
  auditorSignedAt:     z.string().datetime().optional().nullable(),
  status:              z.enum(['planifie', 'en_cours', 'realise', 'reporte', 'annule'] as const).optional(),
  scope:               z.string().optional().nullable(),
  objectives:          z.string().optional().nullable(),
  /** Canonical clause codes for the audit's scope; validated against the register. */
  clauseCodes:         z.array(z.string().max(10)).optional(),
  referenceDocuments:  z.string().optional().nullable(),
  findings:            z.string().optional().nullable(),
  reportAssetId:       z.string().uuid().optional().nullable(),
  notes:               z.string().optional().nullable(),
  items: z.array(z.object({
    /**
     * The row id of an existing finding.
     *
     * This field was missing, and Zod strips unknown keys, so the id the client
     * round-tripped never reached upsertAuditProgramItems. That function used the
     * id to carry `nc_id` across its delete-and-reinsert, so with the id gone it
     * set nc_id back to NULL on every save — each click on a conformity button
     * silently detached the finding from the non-conformity it had raised. The
     * upsert no longer deletes and reinserts, and this id is how it recognises a
     * row it already has.
     */
    id:              z.string().uuid().optional(),
    agendaStep:      z.string().min(1).max(500),
    /** Canonical clause codes for this finding. */
    clauseCodes:     z.array(z.string().max(10)).optional(),
    clauseRef:       z.string().max(100).optional(),
    processStepId:   z.string().uuid().optional().nullable(),
    interlocuteurs:  z.string().max(300).optional(),
    response:        z.string().optional(),
    conformity:      z.enum(['C', 'NC', 'NA', 'PA'] as const).optional(),
    evidence:        z.string().optional(),
    sortOrder:       z.number().int().min(0).optional(),
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

  const existing = await getAuditProgramById(id)
  if (!existing) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })

  const toDate = (v: string | null | undefined) =>
    v === undefined ? undefined : v === null ? null : new Date(v)

  // The reference embeds the programme's year and is immutable, so the scheduled
  // date may not move across a year boundary. Checked before anything is written.
  const scheduleCheck = await checkAuditProgramScheduleChange(id, toDate(d.scheduledDate))
  if (!scheduleCheck.ok) {
    return NextResponse.json(
      { error: scheduleCheck.reason },
      { status: scheduleCheck.reason === 'Programme introuvable' ? 404 : 422 },
    )
  }

  // Every clause reference in the payload — the programme's scope and each
  // finding's — is checked against the ISO register before anything is written,
  // so a partially-applied update cannot leave invalid criteria behind.
  const submitted = [
    ...(d.clauseCodes ?? []),
    ...(d.items ?? []).flatMap((i) => i.clauseCodes ?? []),
  ]
  if (submitted.length > 0) {
    const known = new Set(await filterKnownClauseCodes(submitted))
    const unknown = [...new Set(submitted.map((c) => c.trim()))].filter((c) => !known.has(c))
    if (unknown.length > 0)
      return NextResponse.json(
        { error: `Clauses ISO inconnues : ${unknown.join(', ')}` },
        { status: 422 },
      )
  }

  if (d.auditorId !== undefined && d.auditorId !== null) {
    const auditorCheck = await checkAuditorAssignment({
      auditorId: d.auditorId,
      dept: existing.dept as NcDept,
    })
    if (auditorCheck.errors.length > 0)
      return NextResponse.json({ error: auditorCheck.errors.join(' ') }, { status: 422 })
  }

  await updateAuditProgram(id, {
    title:               d.title,
    auditorName:         d.auditorName,
    auditorId:           d.auditorId,
    auditeeResponsible:  d.auditeeResponsible,
    scheduledDate:       toDate(d.scheduledDate),
    scheduledStartTime:  d.scheduledStartTime,
    scheduledEndTime:    d.scheduledEndTime,
    actualDate:          toDate(d.actualDate),
    auditorSignedAt:     toDate(d.auditorSignedAt),
    status:              d.status as AuditProgramStatus | undefined,
    scope:               d.scope,
    objectives:          d.objectives,
    referenceDocuments:  d.referenceDocuments,
    findings:            d.findings,
    reportAssetId:       d.reportAssetId,
    notes:               d.notes,
  })

  // Written after updateAuditProgram: setAuditProgramClauses owns `criteria`, and
  // running it second means its rendering is what survives.
  if (d.clauseCodes !== undefined)
    await setAuditProgramClauses(id, d.clauseCodes)

  let retainedWithNc: Array<{ id: string; agendaStep: string; ncId: string }> = []
  if (d.items !== undefined) {
    const result = await upsertAuditProgramItems(id, d.items, session.user.userId)
    retainedWithNc = result.retainedWithNc
  }

  const updated = await getAuditProgramById(id)
  return NextResponse.json({ ...updated, retainedWithNc })
}
