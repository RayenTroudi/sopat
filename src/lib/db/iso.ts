import { db } from '../../../db/index'
import {
  nonConformances,
  correctiveActions,
  documents,
  auditLogs,
  auditPrograms,
  auditProgramItems,
  cloudinaryAssets,
  users,
  projects,
  recordAuditLog,
} from '../../../db/schema'
import { eq, and, isNull, desc, asc, sql, ilike, or, inArray, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { recordAudit, type AuditActor } from '../audit-record'
import { diffFields } from '../audit-diff'
import { attachDmsCode } from '../dms/attach'
import { obsoleteDmsDocument } from '../dms/obsolete'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NcStatus = 'open' | 'in_progress' | 'closed' | 'verified'
export type NcProcess = 'etudes' | 'realisation' | 'entretien'
export type NcSource = 'interne' | 'audit' | 'reclamation_client' | 'reclamation_pi'
export type NcDept = 'AC' | 'CO' | 'ET' | 'MI' | 'MI1' | 'MI2' | 'RE1' | 'RE2' | 'RH'
export type CapaStatus = 'open' | 'in_progress' | 'closed'
export type RecordOrigin = 'platform' | 'imported'
export type DocumentStatus = 'draft' | 'active' | 'obsolete'
export type DocumentCategory = 'procedure' | 'instruction' | 'formulaire' | 'enregistrement' | 'autre'
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed'
export type AuditProgramStatus = 'planifie' | 'en_cours' | 'realise' | 'reporte' | 'annule'

// ─── NC reference generator ───────────────────────────────────────────────────

/** Matches a platform reference and captures its year / number. */
const NC_REFERENCE_PATTERN = '^NC-[0-9]{4}-[0-9]+$'

/**
 * Allocates the next number in the NC-YYYY-NNN sequence for `year`, atomically.
 *
 * A single INSERT … ON CONFLICT DO UPDATE does the work: the conflicting path
 * takes a row-level lock on the year's counter, so two concurrent callers are
 * serialised and can never receive the same number. The previous implementation
 * used SELECT count(*) + 1, which raced (both readers saw the same count and
 * collided on the unique reference constraint) and miscounted (it included the
 * imported FOR-MI-05 register rows, which are not part of this sequence).
 *
 * The seed used when a year has no counter yet is the highest number already
 * present in an NC-YYYY-NNN reference for that year, plus one. Soft-deleted rows
 * are included on purpose: a deleted NC keeps its number so it is never reissued.
 * Existing gaps are left as gaps — the counter never backfills.
 */
async function allocateNcReferenceNumber(year: number): Promise<number> {
  const seedPattern = `^NC-${year}-([0-9]+)$`
  const result = await db.execute<{ last_number: number }>(sql`
    INSERT INTO nc_reference_sequences (year, last_number)
    VALUES (
      ${year},
      COALESCE((
        SELECT max(substring(reference from ${seedPattern})::int)
        FROM non_conformances
        WHERE reference ~ ${NC_REFERENCE_PATTERN}
      ), 0) + 1
    )
    ON CONFLICT (year) DO UPDATE
      SET last_number = nc_reference_sequences.last_number + 1,
          updated_at  = now()
    RETURNING last_number
  `)
  return Number(result.rows[0].last_number)
}

/**
 * Next platform NC reference, e.g. "NC-2026-005".
 *
 * `year` is injectable so the sequence can be exercised across a year boundary
 * in tests; production callers use the current year.
 */
export async function generateNcReference(year = new Date().getFullYear()): Promise<string> {
  const seq = await allocateNcReferenceNumber(year)
  return `NC-${year}-${String(seq).padStart(3, '0')}`
}

/**
 * Allocates the next number for `scope` / `year`, atomically.
 *
 * Shared by the audit generators below. `seedSql` supplies the starting point
 * the first time a scope/year is used: the highest number already present in a
 * valid reference, parsed from the reference itself rather than counted, so
 * existing gaps stay gaps and unrelated rows never consume numbers.
 *
 * The conflicting path takes a row-level lock on the counter, so concurrent
 * callers are serialised and can never receive the same number. Because the
 * counter only moves forward and is never recomputed from the table, deleting a
 * record — hard or soft — cannot make its number available again.
 */
async function allocateReferenceNumber(
  scope: string,
  year: number,
  seedSql: SQL,
): Promise<number> {
  const result = await db.execute<{ last_number: number }>(sql`
    INSERT INTO reference_sequences (scope, year, last_number)
    VALUES (${scope}, ${year}, COALESCE((${seedSql}), 0) + 1)
    ON CONFLICT (scope, year) DO UPDATE
      SET last_number = reference_sequences.last_number + 1,
          updated_at  = now()
    RETURNING last_number
  `)
  return Number(result.rows[0].last_number)
}

/**
 * Next internal-audit reference, e.g. "AUD-2026-001".
 *
 * The year is the **registration year** — the year the audit record is created
 * in the system — and is deliberately independent of `auditDate`, which records
 * when the audit is performed. An audit registered in December 2026 for a
 * January 2027 visit is correctly AUD-2026-NNN; that is not a defect, and
 * `auditDate` is immutable after creation so the two cannot drift.
 *
 * Note the difference from generateAuditProgramReference below, which numbers by
 * the **planned year** because audit_programs stores a `year` column that must
 * agree with its reference. audit_logs has no such column, so there is nothing
 * for the reference to disagree with. Please do not "align" the two.
 *
 * `year` is injectable so rollover can be exercised in tests.
 */
export async function generateAuditReference(year = new Date().getFullYear()): Promise<string> {
  const seq = await allocateReferenceNumber(
    'audit',
    year,
    sql`SELECT max(substring(reference from ${`^AUD-${year}-([0-9]+)$`})::int)
        FROM audit_logs
        WHERE reference ~ ${'^AUD-[0-9]{4}-[0-9]+$'}`,
  )
  return `AUD-${year}-${String(seq).padStart(3, '0')}`
}

// ─── NC queries ───────────────────────────────────────────────────────────────

export type NcListItem = {
  id: string
  reference: string
  ncFicheNum: number | null
  ncMonth: string | null
  status: string
  ncType: string | null
  ncSource: string | null
  dept: string | null
  processAffected: string | null
  description: string
  detectedAt: Date
  deadline: Date | null
  correctionDeadlinePlanned: Date | null
  correctionDeadlineActual: Date | null
  correctionDeadlinePlannedText: string | null
  correctionDeadlineActualText: string | null
  correctionProgress: number | null
  isRisk: boolean | null
  isOpportunity: boolean | null
  recordOrigin: string
  projectId: string | null
  projectName: string | null
  detectedByName: string | null
  detectorName: string | null
  assignedToName: string | null
  createdAt: Date
  dmsDocumentCode: string | null
}

export async function listNcs(filters?: {
  status?: NcStatus
  process?: NcProcess
  dept?: NcDept
  ncSource?: NcSource
  projectId?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ rows: NcListItem[]; total: number }> {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25
  const offset = (page - 1) * pageSize

  const detUser  = alias(users, 'det')
  const asgnUser = alias(users, 'asgn')

  const rows = await db
    .select({
      id:                        nonConformances.id,
      reference:                 nonConformances.reference,
      ncFicheNum:                nonConformances.ncFicheNum,
      ncMonth:                   nonConformances.ncMonth,
      status:                    nonConformances.status,
      ncType:                    nonConformances.ncType,
      ncSource:                  nonConformances.ncSource,
      dept:                      nonConformances.dept,
      processAffected:           nonConformances.processAffected,
      description:               nonConformances.description,
      detectedAt:                nonConformances.detectedAt,
      deadline:                  nonConformances.deadline,
      correctionDeadlinePlanned: nonConformances.correctionDeadlinePlanned,
      correctionDeadlineActual:  nonConformances.correctionDeadlineActual,
      correctionDeadlinePlannedText: nonConformances.correctionDeadlinePlannedText,
      correctionDeadlineActualText:  nonConformances.correctionDeadlineActualText,
      correctionProgress:        nonConformances.correctionProgress,
      isRisk:                    nonConformances.isRisk,
      isOpportunity:             nonConformances.isOpportunity,
      recordOrigin:              nonConformances.recordOrigin,
      projectId:                 nonConformances.projectId,
      projectName:               projects.name,
      detectedByName:            detUser.name,
      detectorName:              nonConformances.detectorName,
      assignedToName:            asgnUser.name,
      createdAt:                 nonConformances.createdAt,
      dmsDocumentCode:           nonConformances.dmsDocumentCode,
    })
    .from(nonConformances)
    .leftJoin(projects, eq(nonConformances.projectId, projects.id))
    .leftJoin(detUser,  eq(detUser.id,  nonConformances.detectedBy))
    .leftJoin(asgnUser, eq(asgnUser.id, nonConformances.assignedTo))
    .where(
      and(
        isNull(nonConformances.deletedAt),
        filters?.status    ? eq(nonConformances.status,          filters.status)    : undefined,
        filters?.process   ? eq(nonConformances.processAffected, filters.process as NcProcess) : undefined,
        filters?.dept      ? eq(nonConformances.dept,            filters.dept as NcDept)       : undefined,
        filters?.ncSource  ? eq(nonConformances.ncSource,        filters.ncSource as NcSource) : undefined,
        filters?.projectId ? eq(nonConformances.projectId,       filters.projectId) : undefined,
        filters?.search    ? ilike(nonConformances.description,  `%${filters.search}%`) : undefined,
      )
    )
    .orderBy(desc(nonConformances.detectedAt))
    .limit(pageSize)
    .offset(offset)

  // The count must apply exactly the same predicate as the page query, or
  // filtering by dept / source / project / search reports a wrong page count.
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(nonConformances)
    .where(
      and(
        isNull(nonConformances.deletedAt),
        filters?.status    ? eq(nonConformances.status,          filters.status)    : undefined,
        filters?.process   ? eq(nonConformances.processAffected, filters.process as NcProcess) : undefined,
        filters?.dept      ? eq(nonConformances.dept,            filters.dept as NcDept)       : undefined,
        filters?.ncSource  ? eq(nonConformances.ncSource,        filters.ncSource as NcSource) : undefined,
        filters?.projectId ? eq(nonConformances.projectId,       filters.projectId) : undefined,
        filters?.search    ? ilike(nonConformances.description,  `%${filters.search}%`) : undefined,
      )
    )

  return { rows: rows as NcListItem[], total: Number(total) }
}

export type NcDetail = {
  id: string
  reference: string
  ncFicheNum: number | null
  ncMonth: string | null
  status: string
  ncType: string | null
  ncSource: string | null
  dept: string | null
  processAffected: string | null
  ownerType: string | null
  auditorName: string | null
  referenceDoc: string | null
  description: string
  impact: string | null
  rootCause: string | null
  immediateCorrection: string | null
  derogationAuth: boolean | null
  rebut: boolean | null
  correctionResponsible: string | null
  correctionDeadlinePlanned: Date | null
  correctionDeadlineActual: Date | null
  correctionDeadlinePlannedText: string | null
  correctionDeadlineActualText: string | null
  correctionProgress: number | null
  correctionStatus: string | null
  evalDatePlanned: Date | null
  evalDateActual: Date | null
  clientResponse: string | null
  clientResponseRef: string | null
  isRisk: boolean | null
  isOpportunity: boolean | null
  riskDesignation: string | null
  opportunityDesignation: string | null
  needsSecondCapa: boolean | null
  recordOrigin: string
  importedFrom: string | null
  importedAt: Date | null
  detectedAt: Date
  detectedById: string
  detectedByName: string | null
  detectorName: string | null
  detectorEmail: string | null
  assignedToId: string | null
  assignedToName: string | null
  deadline: Date | null
  closedAt: Date | null
  closedById: string | null
  closedByName: string | null
  projectId: string | null
  projectName: string | null
  beforePhotoAssetId: string | null
  afterPhotoAssetId: string | null
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  createdAt: Date
  dmsDocumentCode: string | null
  capa: CapaDetail[]
}

export type CapaDetail = {
  id: string
  actionDescription: string
  responsibleId: string | null
  responsibleName: string | null
  deadline: Date | null
  deadlinePlanned: Date | null
  deadlineActual: Date | null
  deadlinePlannedText: string | null
  deadlineActualText: string | null
  evalDatePlanned: Date | null
  evalDateActual: Date | null
  evalDatePlannedText: string | null
  evalDateActualText: string | null
  progressStatus: string | null
  status: string
  recordOrigin: string
  effectivenessVerified: boolean
  verifiedAt: Date | null
  verifiedById: string | null
  verifiedByName: string | null
  closedAt: Date | null
  notes: string | null
  evidenceUrl: string | null
  evidenceAssetId: string | null
  createdAt: Date
  dmsDocumentCode: string | null
}

export async function getNcById(id: string): Promise<NcDetail | null> {
  const detUser  = alias(users, 'det')
  const asgnUser = alias(users, 'asgn')
  const clsUser  = alias(users, 'cls')

  const [nc] = await db
    .select({
      id:                        nonConformances.id,
      reference:                 nonConformances.reference,
      ncFicheNum:                nonConformances.ncFicheNum,
      ncMonth:                   nonConformances.ncMonth,
      status:                    nonConformances.status,
      ncType:                    nonConformances.ncType,
      ncSource:                  nonConformances.ncSource,
      dept:                      nonConformances.dept,
      processAffected:           nonConformances.processAffected,
      ownerType:                 nonConformances.ownerType,
      auditorName:               nonConformances.auditorName,
      referenceDoc:              nonConformances.referenceDoc,
      description:               nonConformances.description,
      impact:                    nonConformances.impact,
      rootCause:                 nonConformances.rootCause,
      immediateCorrection:       nonConformances.immediateCorrection,
      derogationAuth:            nonConformances.derogationAuth,
      rebut:                     nonConformances.rebut,
      correctionResponsible:     nonConformances.correctionResponsible,
      correctionDeadlinePlanned: nonConformances.correctionDeadlinePlanned,
      correctionDeadlineActual:  nonConformances.correctionDeadlineActual,
      correctionDeadlinePlannedText: nonConformances.correctionDeadlinePlannedText,
      correctionDeadlineActualText:  nonConformances.correctionDeadlineActualText,
      correctionProgress:        nonConformances.correctionProgress,
      correctionStatus:          nonConformances.correctionStatus,
      evalDatePlanned:           nonConformances.evalDatePlanned,
      evalDateActual:            nonConformances.evalDateActual,
      clientResponse:            nonConformances.clientResponse,
      clientResponseRef:         nonConformances.clientResponseRef,
      isRisk:                    nonConformances.isRisk,
      isOpportunity:             nonConformances.isOpportunity,
      riskDesignation:           nonConformances.riskDesignation,
      opportunityDesignation:    nonConformances.opportunityDesignation,
      needsSecondCapa:           nonConformances.needsSecondCapa,
      recordOrigin:              nonConformances.recordOrigin,
      importedFrom:              nonConformances.importedFrom,
      importedAt:                nonConformances.importedAt,
      detectedAt:                nonConformances.detectedAt,
      detectedById:              nonConformances.detectedBy,
      detectedByName:            detUser.name,
      detectorName:              nonConformances.detectorName,
      detectorEmail:             nonConformances.detectorEmail,
      assignedToId:              nonConformances.assignedTo,
      assignedToName:            asgnUser.name,
      deadline:                  nonConformances.deadline,
      closedAt:                  nonConformances.closedAt,
      closedById:                nonConformances.closedBy,
      closedByName:              clsUser.name,
      projectId:                 nonConformances.projectId,
      projectName:               projects.name,
      beforePhotoAssetId:        nonConformances.beforePhotoAssetId,
      afterPhotoAssetId:         nonConformances.afterPhotoAssetId,
      // Resolved here so the detail page can render the uploaded photos; the
      // asset id alone is not enough to display anything.
      beforePhotoUrl:            sql<string | null>`bph.secure_url`,
      afterPhotoUrl:             sql<string | null>`aph.secure_url`,
      createdAt:                 nonConformances.createdAt,
      dmsDocumentCode:           nonConformances.dmsDocumentCode,
    })
    .from(nonConformances)
    .leftJoin(projects, eq(nonConformances.projectId, projects.id))
    .leftJoin(detUser,  eq(detUser.id,  nonConformances.detectedBy))
    .leftJoin(asgnUser, eq(asgnUser.id, nonConformances.assignedTo))
    .leftJoin(clsUser,  eq(clsUser.id,  nonConformances.closedBy))
    .leftJoin(sql`cloudinary_assets bph`, sql`bph.id = ${nonConformances.beforePhotoAssetId}`)
    .leftJoin(sql`cloudinary_assets aph`, sql`aph.id = ${nonConformances.afterPhotoAssetId}`)
    .where(and(eq(nonConformances.id, id), isNull(nonConformances.deletedAt)))
    .limit(1)

  if (!nc) return null

  const capas = await db
    .select({
      id:                    correctiveActions.id,
      actionDescription:     correctiveActions.actionDescription,
      responsibleId:         correctiveActions.responsibleId,
      // The register names a role ("RMI", "DG", "Equipe réalisation") that often
      // has no account, so the explicit free-text value wins over the joined user.
      responsibleName:       sql<string | null>`coalesce(${correctiveActions.responsibleName}, resp.name)`,
      deadline:              correctiveActions.deadline,
      deadlinePlanned:       correctiveActions.deadlinePlanned,
      deadlineActual:        correctiveActions.deadlineActual,
      deadlinePlannedText:   correctiveActions.deadlinePlannedText,
      deadlineActualText:    correctiveActions.deadlineActualText,
      evalDatePlanned:       correctiveActions.evalDatePlanned,
      evalDateActual:        correctiveActions.evalDateActual,
      evalDatePlannedText:   correctiveActions.evalDatePlannedText,
      evalDateActualText:    correctiveActions.evalDateActualText,
      progressStatus:        correctiveActions.progressStatus,
      status:                correctiveActions.status,
      recordOrigin:          correctiveActions.recordOrigin,
      effectivenessVerified: correctiveActions.effectivenessVerified,
      verifiedAt:            correctiveActions.verifiedAt,
      verifiedById:          correctiveActions.verifiedBy,
      verifiedByName:        sql<string | null>`vby.name`,
      closedAt:              correctiveActions.closedAt,
      notes:                 correctiveActions.notes,
      evidenceAssetId:       correctiveActions.evidenceAssetId,
      evidenceUrl:           cloudinaryAssets.secureUrl,
      createdAt:             correctiveActions.createdAt,
      dmsDocumentCode:       correctiveActions.dmsDocumentCode,
    })
    .from(correctiveActions)
    .leftJoin(sql`users resp`, sql`resp.id = ${correctiveActions.responsibleId}`)
    .leftJoin(sql`users vby`,  sql`vby.id = ${correctiveActions.verifiedBy}`)
    .leftJoin(cloudinaryAssets, eq(correctiveActions.evidenceAssetId, cloudinaryAssets.id))
    .where(eq(correctiveActions.ncId, id))
    .orderBy(asc(correctiveActions.createdAt))

  return { ...nc, capa: capas } as NcDetail
}

export async function createNc(input: {
  reference:                  string
  ncFicheNum?:                number
  ncMonth?:                   string
  projectId?:                 string
  processAffected?:           string
  dept?:                      string
  ncType?:                    string
  ncSource?:                  string
  ownerType?:                 string
  auditorName?:               string
  detectorName?:              string
  detectorEmail?:             string
  referenceDoc?:              string
  description:                string
  impact?:                    string
  rootCause?:                 string
  immediateCorrection?:       string
  derogationAuth?:            boolean
  rebut?:                     boolean
  correctionResponsible?:     string
  correctionDeadlinePlanned?: Date
  correctionDeadlineActual?:  Date
  correctionDeadlinePlannedText?: string
  correctionDeadlineActualText?:  string
  correctionProgress?:        number
  correctionStatus?:          string
  evalDatePlanned?:           Date
  evalDateActual?:            Date
  clientResponse?:            string
  clientResponseRef?:         string
  isRisk?:                    boolean
  isOpportunity?:             boolean
  riskDesignation?:           string
  opportunityDesignation?:    string
  needsSecondCapa?:           boolean
  /** FOR-MI-05 "Date" column; defaults to now() when the NC is raised in-app. */
  detectedAt?:                Date
  assignedTo?:                string
  deadline?:                  Date
  beforePhotoAssetId?:        string
  afterPhotoAssetId?:         string
  detectedBy:                 string
  createdBy:                  string
  /** ISO 9001 traceability — omitted only by data-migration scripts. */
  actor?:                     AuditActor
}) {
  return db.transaction(async (tx) => {
    const [nc] = await tx
      .insert(nonConformances)
      .values({
        reference:                  input.reference,
        ncFicheNum:                 input.ncFicheNum ?? null,
        ncMonth:                    input.ncMonth ?? null,
        projectId:                  input.projectId || null,
        processAffected:            (input.processAffected as NcProcess) || null,
        dept:                       (input.dept as NcDept) || null,
        ncType:                     (input.ncType as typeof nonConformances.$inferInsert['ncType']) || null,
        ncSource:                   (input.ncSource as NcSource) || null,
        ownerType:                  (input.ownerType as typeof nonConformances.$inferInsert['ownerType']) || null,
        auditorName:                input.auditorName,
        detectorName:               input.detectorName,
        detectorEmail:              input.detectorEmail,
        referenceDoc:               input.referenceDoc,
        description:                input.description,
        impact:                     input.impact,
        rootCause:                  input.rootCause,
        immediateCorrection:        input.immediateCorrection,
        derogationAuth:             input.derogationAuth ?? false,
        rebut:                      input.rebut ?? false,
        correctionResponsible:      input.correctionResponsible,
        correctionDeadlinePlanned:  input.correctionDeadlinePlanned,
        correctionDeadlineActual:   input.correctionDeadlineActual,
        correctionDeadlinePlannedText: input.correctionDeadlinePlannedText ?? null,
        correctionDeadlineActualText:  input.correctionDeadlineActualText ?? null,
        correctionProgress:         input.correctionProgress ?? null,
        correctionStatus:           input.correctionStatus,
        evalDatePlanned:            input.evalDatePlanned,
        evalDateActual:             input.evalDateActual,
        clientResponse:             input.clientResponse,
        clientResponseRef:          input.clientResponseRef ?? null,
        isRisk:                     input.isRisk ?? false,
        isOpportunity:              input.isOpportunity ?? false,
        riskDesignation:            input.riskDesignation ?? null,
        opportunityDesignation:     input.opportunityDesignation ?? null,
        needsSecondCapa:            input.needsSecondCapa ?? false,
        ...(input.detectedAt ? { detectedAt: input.detectedAt } : {}),
        assignedTo:                 input.assignedTo || null,
        deadline:                   input.deadline,
        beforePhotoAssetId:         input.beforePhotoAssetId || null,
        afterPhotoAssetId:          input.afterPhotoAssetId || null,
        detectedBy:                 input.detectedBy,
        status:                     'open',
        createdBy:                  input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'MI',
      designation: input.description,
      department:  'qualite',
      category:    'ncr',
      entityType:  'non_conformance',
      entityId:    nc.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(nonConformances)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(nonConformances.id, nc.id))

    if (input.actor) {
      await recordAudit(tx, {
        entityType: 'non_conformance',
        entityId:   nc.id,
        action:     'created',
        actor:      input.actor,
        newState: {
          reference: nc.reference, ncFicheNum: nc.ncFicheNum, ncMonth: nc.ncMonth,
          ncType: nc.ncType, ncSource: nc.ncSource, dept: nc.dept,
          description: nc.description, impact: nc.impact,
          detectedAt: nc.detectedAt, status: nc.status,
          isRisk: nc.isRisk, isOpportunity: nc.isOpportunity,
        },
        metadata: { dmsDocumentCode: dmsCode },
      })
    }

    return { ...nc, dmsDocumentCode: dmsCode }
  })
}

export async function updateNcStatus(
  id: string,
  status: NcStatus,
  actorId: string,
  opts?: { rootCause?: string; closedAt?: Date; actor?: AuditActor }
) {
  const now = new Date()
  const [current] = await db
    .select({
      status: nonConformances.status,
      closedAt: nonConformances.closedAt,
      rootCause: nonConformances.rootCause,
    })
    .from(nonConformances)
    .where(eq(nonConformances.id, id))
    .limit(1)

  const isClosing = status === 'closed' || status === 'verified'
  const wasClosed = current?.status === 'closed' || current?.status === 'verified'
  // Preserve the original closure record: re-saving an already-closed NC (e.g.
  // editing its root cause, or moving closed → verified) must not re-stamp
  // closedAt/closedBy with today's date and the current editor. ISO 9001
  // traceability requires the first closure to survive later edits.
  const keepExistingClosure = isClosing && wasClosed && current?.closedAt != null

  await db.transaction(async (tx) => {
    await tx
      .update(nonConformances)
      .set({
        status,
        rootCause: opts?.rootCause,
        ...(isClosing
          ? keepExistingClosure
            ? (opts?.closedAt ? { closedAt: opts.closedAt } : {})
            : { closedAt: opts?.closedAt ?? now, closedBy: actorId }
          : { closedAt: null, closedBy: null }),
        updatedAt: now,
      })
      .where(eq(nonConformances.id, id))

    if (!opts?.actor) return
    const changed = diffFields(
      { status: current?.status ?? null, rootCause: current?.rootCause ?? null },
      { status, ...(opts.rootCause !== undefined && { rootCause: opts.rootCause }) },
    )
    if (!changed) return
    // A status transition is a quality decision, so it is named as such rather
    // than folded into a generic "updated" entry.
    const action =
      status === current?.status ? 'updated'
      : status === 'verified'    ? 'verified'
      : isClosing                ? 'closed'
      : wasClosed                ? 'reopened'
      : 'status_changed'
    await recordAudit(tx, {
      entityType: 'non_conformance',
      entityId:   id,
      action,
      actor:      opts.actor,
      previousState: changed.previous,
      newState:      changed.next,
      metadata: { closurePreserved: keepExistingClosure },
    })
  })
}

export async function updateNcFields(
  id: string,
  fields: {
    description?:               string
    ncType?:                    string | null
    ncSource?:                  string | null
    dept?:                      string | null
    ownerType?:                 string | null
    processAffected?:           string | null
    auditorName?:               string | null
    detectorName?:              string | null
    detectorEmail?:             string | null
    referenceDoc?:              string | null
    impact?:                    string | null
    immediateCorrection?:       string | null
    derogationAuth?:            boolean | null
    rebut?:                     boolean | null
    correctionResponsible?:     string | null
    correctionDeadlinePlanned?: Date | null
    correctionDeadlineActual?:  Date | null
    correctionDeadlinePlannedText?: string | null
    correctionDeadlineActualText?:  string | null
    correctionProgress?:        number | null
    correctionStatus?:          string | null
    evalDatePlanned?:           Date | null
    evalDateActual?:            Date | null
    clientResponse?:            string | null
    isRisk?:                    boolean | null
    isOpportunity?:             boolean | null
    riskDesignation?:           string | null
    opportunityDesignation?:    string | null
    needsSecondCapa?:           boolean | null
    assignedTo?:                string | null
    deadline?:                  Date | null
    rootCause?:                 string | null
  },
  /** ISO 9001 traceability — omitted only by data-migration scripts. */
  actor?: AuditActor,
) {
  const [before] = actor
    ? await db.select().from(nonConformances).where(eq(nonConformances.id, id)).limit(1)
    : [null]

  await db
    .update(nonConformances)
    .set({
      ...(fields.description             !== undefined && { description: fields.description }),
      ...(fields.ncType                  !== undefined && { ncType: fields.ncType as typeof nonConformances.$inferInsert['ncType'] }),
      ...(fields.ncSource                !== undefined && { ncSource: fields.ncSource as NcSource }),
      ...(fields.dept                    !== undefined && { dept: fields.dept as NcDept }),
      ...(fields.ownerType               !== undefined && { ownerType: fields.ownerType as typeof nonConformances.$inferInsert['ownerType'] }),
      ...(fields.processAffected         !== undefined && { processAffected: fields.processAffected as typeof nonConformances.$inferInsert['processAffected'] }),
      ...(fields.auditorName             !== undefined && { auditorName: fields.auditorName }),
      ...(fields.detectorName            !== undefined && { detectorName: fields.detectorName }),
      ...(fields.detectorEmail           !== undefined && { detectorEmail: fields.detectorEmail }),
      ...(fields.referenceDoc            !== undefined && { referenceDoc: fields.referenceDoc }),
      ...(fields.impact                  !== undefined && { impact: fields.impact }),
      ...(fields.immediateCorrection     !== undefined && { immediateCorrection: fields.immediateCorrection }),
      ...(fields.derogationAuth          !== undefined && { derogationAuth: fields.derogationAuth }),
      ...(fields.rebut                   !== undefined && { rebut: fields.rebut }),
      ...(fields.correctionResponsible   !== undefined && { correctionResponsible: fields.correctionResponsible }),
      ...(fields.correctionDeadlinePlanned !== undefined && { correctionDeadlinePlanned: fields.correctionDeadlinePlanned }),
      ...(fields.correctionDeadlineActual  !== undefined && { correctionDeadlineActual: fields.correctionDeadlineActual }),
      ...(fields.correctionDeadlinePlannedText !== undefined && { correctionDeadlinePlannedText: fields.correctionDeadlinePlannedText }),
      ...(fields.correctionDeadlineActualText  !== undefined && { correctionDeadlineActualText: fields.correctionDeadlineActualText }),
      ...(fields.correctionProgress        !== undefined && { correctionProgress: fields.correctionProgress }),
      ...(fields.correctionStatus        !== undefined && { correctionStatus: fields.correctionStatus }),
      ...(fields.evalDatePlanned         !== undefined && { evalDatePlanned: fields.evalDatePlanned }),
      ...(fields.evalDateActual          !== undefined && { evalDateActual: fields.evalDateActual }),
      ...(fields.clientResponse          !== undefined && { clientResponse: fields.clientResponse }),
      ...(fields.isRisk                  !== undefined && { isRisk: fields.isRisk }),
      ...(fields.isOpportunity           !== undefined && { isOpportunity: fields.isOpportunity }),
      ...(fields.riskDesignation         !== undefined && { riskDesignation: fields.riskDesignation }),
      ...(fields.opportunityDesignation  !== undefined && { opportunityDesignation: fields.opportunityDesignation }),
      ...(fields.needsSecondCapa         !== undefined && { needsSecondCapa: fields.needsSecondCapa }),
      ...(fields.assignedTo              !== undefined && { assignedTo: fields.assignedTo }),
      ...(fields.deadline                !== undefined && { deadline: fields.deadline }),
      ...(fields.rootCause               !== undefined && { rootCause: fields.rootCause }),
      updatedAt: new Date(),
    })
    .where(eq(nonConformances.id, id))

  if (!actor || !before) return
  // Only the fields that actually moved are journalled, so an unchanged
  // re-submit does not bury real edits in noise.
  const changed = diffFields(before as Record<string, unknown>, fields as Record<string, unknown>)
  if (!changed) return
  await recordAudit(db, {
    entityType: 'non_conformance',
    entityId:   id,
    action:     'updated',
    actor,
    previousState: changed.previous,
    newState:      changed.next,
    metadata: { reference: before.reference, statusAtChange: before.status },
  })
}

export async function softDeleteNc(id: string, actorId: string, actor?: AuditActor): Promise<boolean> {
  const result = await db
    .update(nonConformances)
    .set({ deletedAt: new Date() })
    .where(and(eq(nonConformances.id, id), isNull(nonConformances.deletedAt)))
    .returning({
      id: nonConformances.id,
      reference: nonConformances.reference,
      status: nonConformances.status,
      dmsDocumentCode: nonConformances.dmsDocumentCode,
    })
  if (result.length === 0) return false
  const code = result[0].dmsDocumentCode
  if (code) await obsoleteDmsDocument(db, code, actorId)
  if (actor) {
    await recordAudit(db, {
      entityType: 'non_conformance',
      entityId:   id,
      action:     'deleted',
      actor,
      previousState: { reference: result[0].reference, status: result[0].status, deletedAt: null },
      newState:      { deletedAt: new Date().toISOString() },
      metadata: { dmsDocumentCode: code },
    })
  }
  return true
}

export async function softDeleteCapa(
  id: string, ncId: string, actorId: string, actor?: AuditActor,
): Promise<boolean> {
  const result = await db
    .update(correctiveActions)
    .set({ status: 'closed' })
    .where(and(eq(correctiveActions.id, id), eq(correctiveActions.ncId, ncId)))
    .returning({
      id: correctiveActions.id,
      status: correctiveActions.status,
      dmsDocumentCode: correctiveActions.dmsDocumentCode,
    })
  if (result.length === 0) return false
  const code = result[0].dmsDocumentCode
  if (code) await obsoleteDmsDocument(db, code, actorId)
  if (actor) {
    await recordAudit(db, {
      entityType: 'corrective_action',
      entityId:   id,
      action:     'deleted',
      actor,
      newState:   { status: 'closed' },
      metadata:   { ncId, dmsDocumentCode: code },
    })
  }
  return true
}

export async function softDeleteAudit(id: string, actorId: string): Promise<boolean> {
  const result = await db
    .update(auditLogs)
    .set({ status: 'completed' })
    .where(eq(auditLogs.id, id))
    .returning({ id: auditLogs.id, dmsDocumentCode: auditLogs.dmsDocumentCode })
  if (result.length === 0) return false
  const code = result[0].dmsDocumentCode
  if (code) await obsoleteDmsDocument(db, code, actorId)
  return true
}

export async function updateNcPhotos(
  id: string,
  photos: { beforePhotoAssetId?: string; afterPhotoAssetId?: string }
) {
  await db
    .update(nonConformances)
    .set({
      ...(photos.beforePhotoAssetId !== undefined && { beforePhotoAssetId: photos.beforePhotoAssetId }),
      ...(photos.afterPhotoAssetId !== undefined && { afterPhotoAssetId: photos.afterPhotoAssetId }),
      updatedAt: new Date(),
    })
    .where(eq(nonConformances.id, id))
}

// ─── CAPA ─────────────────────────────────────────────────────────────────────

export async function createCapa(input: {
  ncId:              string
  actionDescription: string
  /** Optional: the register often names a role with no platform account. */
  responsibleId?:    string | null
  responsibleName?:  string
  deadlinePlanned?:  Date
  deadlineActual?:   Date
  deadlinePlannedText?: string
  deadlineActualText?:  string
  deadline?:         Date
  evalDatePlanned?:  Date
  evalDateActual?:   Date
  evalDatePlannedText?: string
  evalDateActualText?:  string
  progressStatus?:   string
  notes?:            string
  createdBy:         string
  /** ISO 9001 traceability — omitted only by data-migration scripts. */
  actor?:            AuditActor
}) {
  return db.transaction(async (tx) => {
    const [capa] = await tx
      .insert(correctiveActions)
      .values({
        ncId:              input.ncId,
        actionDescription: input.actionDescription,
        responsibleId:     input.responsibleId ?? null,
        responsibleName:   input.responsibleName,
        deadlinePlanned:   input.deadlinePlanned,
        deadlineActual:    input.deadlineActual,
        deadlinePlannedText: input.deadlinePlannedText,
        deadlineActualText:  input.deadlineActualText,
        deadline:          input.deadlinePlanned ?? input.deadline,
        evalDatePlanned:   input.evalDatePlanned,
        evalDateActual:    input.evalDateActual,
        evalDatePlannedText: input.evalDatePlannedText,
        evalDateActualText:  input.evalDateActualText,
        progressStatus:    input.progressStatus,
        notes:             input.notes,
        status:            'open',
        createdBy:         input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'PRC',
      processCode: 'MI',
      designation: input.actionDescription,
      department:  'qualite',
      category:    'capa',
      entityType:  'corrective_action',
      entityId:    capa.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(correctiveActions)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(correctiveActions.id, capa.id))

    if (input.actor) {
      await recordAudit(tx, {
        entityType: 'corrective_action',
        entityId:   capa.id,
        action:     'created',
        actor:      input.actor,
        newState: {
          ncId: capa.ncId, actionDescription: capa.actionDescription,
          responsibleId: capa.responsibleId, responsibleName: capa.responsibleName,
          deadlinePlanned: capa.deadlinePlanned, deadlinePlannedText: capa.deadlinePlannedText,
          progressStatus: capa.progressStatus, status: capa.status,
        },
        metadata: { ncId: capa.ncId, dmsDocumentCode: dmsCode },
      })
    }

    return { ...capa, dmsDocumentCode: dmsCode }
  })
}

export async function updateCapa(
  capaId: string,
  input: {
    actionDescription?: string
    responsibleId?:     string | null
    responsibleName?:   string | null
    deadlinePlanned?:   Date | null
    deadlineActual?:    Date | null
    deadlinePlannedText?: string | null
    deadlineActualText?:  string | null
    evalDatePlanned?:   Date | null
    evalDateActual?:    Date | null
    evalDatePlannedText?: string | null
    evalDateActualText?:  string | null
    progressStatus?:    string | null
    status?:            CapaStatus
    evidenceAssetId?:   string
    effectivenessVerified?: boolean
    verifiedBy?:        string
    closedAt?:          Date
    notes?:             string
  },
  /** ISO 9001 traceability — omitted only by data-migration scripts. */
  actor?: AuditActor,
) {
  const now = new Date()
  const [before] = actor
    ? await db.select().from(correctiveActions).where(eq(correctiveActions.id, capaId)).limit(1)
    : [null]

  const [updated] = await db
    .update(correctiveActions)
    .set({
      ...(input.actionDescription !== undefined && { actionDescription: input.actionDescription }),
      ...(input.responsibleId     !== undefined && { responsibleId: input.responsibleId }),
      ...(input.responsibleName   !== undefined && { responsibleName: input.responsibleName }),
      ...(input.deadlinePlanned   !== undefined && { deadlinePlanned: input.deadlinePlanned, deadline: input.deadlinePlanned }),
      ...(input.deadlineActual    !== undefined && { deadlineActual: input.deadlineActual }),
      ...(input.deadlinePlannedText !== undefined && { deadlinePlannedText: input.deadlinePlannedText }),
      ...(input.deadlineActualText  !== undefined && { deadlineActualText: input.deadlineActualText }),
      ...(input.evalDatePlanned   !== undefined && { evalDatePlanned: input.evalDatePlanned }),
      ...(input.evalDateActual    !== undefined && { evalDateActual: input.evalDateActual }),
      ...(input.evalDatePlannedText !== undefined && { evalDatePlannedText: input.evalDatePlannedText }),
      ...(input.evalDateActualText  !== undefined && { evalDateActualText: input.evalDateActualText }),
      ...(input.progressStatus    !== undefined && { progressStatus: input.progressStatus }),
      ...(input.status            !== undefined && { status: input.status }),
      ...(input.evidenceAssetId   !== undefined && { evidenceAssetId: input.evidenceAssetId }),
      ...(input.effectivenessVerified !== undefined && { effectivenessVerified: input.effectivenessVerified }),
      ...(input.notes             !== undefined && { notes: input.notes }),
      verifiedAt: input.effectivenessVerified ? now : undefined,
      closedAt:   input.status === 'closed' ? (input.closedAt ?? now) : undefined,
      updatedAt:  now,
    })
    .where(eq(correctiveActions.id, capaId))
    .returning()

  if (actor && before) {
    const changed = diffFields(before as Record<string, unknown>, input as Record<string, unknown>)
    if (changed) {
      // Effectiveness verification is the ISO-critical transition, so it is
      // named rather than reported as a generic update.
      const action = input.effectivenessVerified && !before.effectivenessVerified
        ? 'verified'
        : input.status === 'closed' && before.status !== 'closed'
          ? 'closed'
          : 'updated'
      await recordAudit(db, {
        entityType: 'corrective_action',
        entityId:   capaId,
        action,
        actor,
        previousState: changed.previous,
        newState:      changed.next,
        metadata: { ncId: before.ncId },
      })
    }
  }

  return updated
}

export type NcRegisterRow = NcDetail

/**
 * Every FOR-MI-05 column for the whole register, ordered by N° Fiche as the
 * paper form is. Used by the Excel export so the ISO record can be regenerated
 * from the platform rather than only summarised.
 */
export async function listNcsForRegisterExport(filters?: {
  status?: NcStatus
  year?: number
}): Promise<NcRegisterRow[]> {
  const ids = await db
    .select({ id: nonConformances.id })
    .from(nonConformances)
    .where(
      and(
        isNull(nonConformances.deletedAt),
        filters?.status ? eq(nonConformances.status, filters.status) : undefined,
        filters?.year
          ? sql`extract(year from ${nonConformances.detectedAt}) = ${filters.year}`
          : undefined,
      )
    )
    .orderBy(
      sql`${nonConformances.ncFicheNum} nulls last`,
      asc(nonConformances.detectedAt)
    )

  const rows: NcRegisterRow[] = []
  for (const { id } of ids) {
    const nc = await getNcById(id)
    if (nc) rows.push(nc)
  }
  return rows
}

/** Full ISO trail for one NC: its own entries plus those of its CAPAs. */
export async function getNcAuditTrail(ncId: string) {
  const capaIds = await db
    .select({ id: correctiveActions.id })
    .from(correctiveActions)
    .where(eq(correctiveActions.ncId, ncId))

  const ids = capaIds.map((c) => c.id)
  const rows = await db
    .select({
      id:            recordAuditLog.id,
      entityType:    recordAuditLog.entityType,
      entityId:      recordAuditLog.entityId,
      action:        recordAuditLog.action,
      actorName:     recordAuditLog.actorName,
      actorRole:     recordAuditLog.actorRoleSnapshot,
      previousState: recordAuditLog.previousState,
      newState:      recordAuditLog.newState,
      occurredAt:    recordAuditLog.occurredAt,
    })
    .from(recordAuditLog)
    .where(
      or(
        and(eq(recordAuditLog.entityType, 'non_conformance'), eq(recordAuditLog.entityId, ncId)),
        ids.length
          ? and(
              eq(recordAuditLog.entityType, 'corrective_action'),
              inArray(recordAuditLog.entityId, ids),
            )
          : undefined,
      )
    )
    .orderBy(desc(recordAuditLog.occurredAt))

  return rows
}

export type NcClosureCheck = {
  ok: boolean
  reason: string | null
  /** True when the record was exempted because it predates the platform workflow. */
  historical: boolean
}

/**
 * Closure prerequisites for an NC.
 *
 * Records raised in the platform must satisfy the full ISO 9001 chain before
 * they can be closed or verified: a corrective action, documented evidence, an
 * effectiveness verification, and a verifier independent of the detector. That
 * requirement is deliberately blocking and is NOT relaxed here.
 *
 * Records imported from the historical Excel register are the single exception.
 * They predate the workflow, so the evidence and effectiveness fields were never
 * captured at source. The alternative to exempting them would be to fabricate
 * evidence or an effectiveness verification that never took place, which would
 * corrupt the quality record far more seriously than the missing data does. The
 * exemption is keyed on `recordOrigin`, which the public API cannot set.
 */
export async function checkNcClosePrerequisites(
  ncId: string,
  actorId: string,
  targetStatus: 'closed' | 'verified' = 'closed',
): Promise<NcClosureCheck> {
  void actorId // independence is evaluated per-CAPA below, not against the caller
  const nc = await getNcById(ncId)
  if (!nc) return { ok: false, reason: 'NC introuvable', historical: false }

  if (nc.recordOrigin === 'imported') {
    // 'closed' restates a fact already recorded in the source register, so it is
    // allowed without evidence. 'verified' is a present-tense claim that the
    // corrective action was checked for effectiveness — asserting that on a
    // record where no verification ever happened would fabricate the very thing
    // ISO 9001 asks us to evidence, so it still requires a real verification.
    if (targetStatus === 'closed') {
      return { ok: true, reason: null, historical: true }
    }
    const verifiedInPlatform = nc.capa.some((c) => c.effectivenessVerified)
    if (verifiedInPlatform) {
      return { ok: true, reason: null, historical: true }
    }
    return {
      ok: false,
      historical: true,
      reason:
        'Fiche historique importée : aucune vérification d\'efficacité n\'existe dans le registre d\'origine. ' +
        'Enregistrez une vérification d\'efficacité réelle avant de marquer la fiche comme vérifiée, ' +
        'ou conservez-la au statut « Clôturé » tel qu\'il figure au registre.',
    }
  }

  const hasCapa = nc.capa.length > 0
  const hasEvidence = nc.capa.some((c) => c.evidenceAssetId !== null)
  const hasVerification = nc.capa.some((c) => c.effectivenessVerified)
  // ISO independence: verifier must differ from creator
  const verifierIsIndependent = nc.capa.every(
    (c) => !c.verifiedById || c.verifiedById !== nc.detectedById
  )

  if (!hasCapa)           return { ok: false, reason: 'Aucune action corrective n\'a été créée', historical: false }
  if (!hasEvidence)       return { ok: false, reason: 'Aucune preuve d\'action corrective n\'a été téléchargée', historical: false }
  if (!hasVerification)   return { ok: false, reason: 'L\'efficacité de l\'action corrective n\'a pas été vérifiée', historical: false }
  if (!verifierIsIndependent) return { ok: false, reason: 'Le vérificateur doit être différent du détecteur de la NC (indépendance ISO 9001)', historical: false }

  return { ok: true, reason: null, historical: false }
}

// ─── Documents ────────────────────────────────────────────────────────────────

export type DocumentRow = {
  id: string
  code: string
  title: string
  category: string
  version: string
  status: string
  isoClause: string | null
  processAffected: string | null
  effectiveDate: Date | null
  reviewDate: Date | null
  notes: string | null
  ownerId: string
  ownerName: string | null
  assetId: string | null
  assetUrl: string | null
  obsoletedAt: Date | null
  supersededById: string | null
  createdAt: Date
  updatedAt: Date
}

export async function listDocuments(filters?: {
  status?:   DocumentStatus
  category?: DocumentCategory
  search?:   string
  page?:     number
  pageSize?: number
}): Promise<{ rows: DocumentRow[]; total: number }> {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 50
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id:              documents.id,
      code:            documents.code,
      title:           documents.title,
      category:        documents.category,
      version:         documents.version,
      status:          documents.status,
      isoClause:       documents.isoClause,
      processAffected: documents.processAffected,
      effectiveDate:   documents.effectiveDate,
      reviewDate:      documents.reviewDate,
      notes:           documents.notes,
      ownerId:         documents.ownerId,
      ownerName:       users.name,
      assetId:         documents.assetId,
      assetUrl:        cloudinaryAssets.secureUrl,
      obsoletedAt:     documents.obsoletedAt,
      supersededById:  documents.supersededById,
      createdAt:       documents.createdAt,
      updatedAt:       documents.updatedAt,
    })
    .from(documents)
    .leftJoin(users, eq(documents.ownerId, users.id))
    .leftJoin(cloudinaryAssets, eq(documents.assetId, cloudinaryAssets.id))
    .where(
      and(
        filters?.status   ? eq(documents.status,   filters.status)   : undefined,
        filters?.category ? eq(documents.category, filters.category) : undefined,
        filters?.search   ? or(
          ilike(documents.title, `%${filters.search}%`),
          ilike(documents.code,  `%${filters.search}%`)
        ) : undefined,
      )
    )
    .orderBy(asc(documents.code))
    .limit(pageSize)
    .offset(offset)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(documents)
    .where(filters?.status ? eq(documents.status, filters.status) : undefined)

  return { rows: rows as DocumentRow[], total: Number(total) }
}

export async function createDocument(input: {
  code:            string
  title:           string
  category:        DocumentCategory
  version:         string
  status:          DocumentStatus
  ownerId:         string
  assetId?:        string
  isoClause?:      string
  processAffected?: string
  effectiveDate?:  Date
  reviewDate?:     Date
  notes?:          string
  createdBy:       string
}) {
  // If creating a new version of an existing code, obsolete the previous active version
  const [prev] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.code, input.code), eq(documents.status, 'active')))
    .limit(1)

  const now = new Date()

  if (prev) {
    await db
      .update(documents)
      .set({ status: 'obsolete', obsoletedAt: now, updatedAt: now })
      .where(eq(documents.id, prev.id))
  }

  const [doc] = await db
    .insert(documents)
    .values({
      code:            input.code,
      title:           input.title,
      category:        input.category,
      version:         input.version,
      status:          input.status,
      ownerId:         input.ownerId,
      assetId:         input.assetId || null,
      isoClause:       input.isoClause,
      processAffected: input.processAffected as NcProcess | undefined,
      effectiveDate:   input.effectiveDate,
      reviewDate:      input.reviewDate,
      notes:           input.notes,
      supersededById:  null,
      createdBy:       input.createdBy,
    })
    .returning()

  // Link old version forward to new
  if (prev) {
    await db
      .update(documents)
      .set({ supersededById: doc.id, updatedAt: now })
      .where(eq(documents.id, prev.id))
  }

  return doc
}

export async function getDocumentVersionHistory(code: string) {
  return db
    .select({
      id:        documents.id,
      version:   documents.version,
      status:    documents.status,
      createdAt: documents.createdAt,
      assetUrl:  cloudinaryAssets.secureUrl,
    })
    .from(documents)
    .leftJoin(cloudinaryAssets, eq(documents.assetId, cloudinaryAssets.id))
    .where(eq(documents.code, code))
    .orderBy(desc(documents.createdAt))
}

// ─── Audits ───────────────────────────────────────────────────────────────────

export type AuditRow = {
  id: string
  reference: string
  auditorId: string
  auditorName: string | null
  auditDate: Date
  processAudited: string
  scope: string | null
  findings: string | null
  status: string
  completedAt: Date | null
  dmsDocumentCode: string | null
  createdAt: Date
}

export async function listAudits(filters?: {
  status?:  AuditStatus
  process?: string
  page?:    number
  pageSize?: number
}): Promise<{ rows: AuditRow[]; total: number }> {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id:              auditLogs.id,
      reference:       auditLogs.reference,
      auditorId:       auditLogs.auditorId,
      auditorName:     users.name,
      auditDate:       auditLogs.auditDate,
      processAudited:  auditLogs.processAudited,
      scope:           auditLogs.scope,
      findings:        auditLogs.findings,
      status:          auditLogs.status,
      completedAt:     auditLogs.completedAt,
      dmsDocumentCode: auditLogs.dmsDocumentCode,
      createdAt:       auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.auditorId, users.id))
    .where(
      and(
        filters?.status  ? eq(auditLogs.status,         filters.status)  : undefined,
        filters?.process ? eq(auditLogs.processAudited, filters.process) : undefined,
      )
    )
    .orderBy(desc(auditLogs.auditDate))
    .limit(pageSize)
    .offset(offset)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(auditLogs)

  return { rows: rows as AuditRow[], total: Number(total) }
}

export async function createAudit(input: {
  reference:      string
  auditorId:      string
  auditDate:      Date
  processAudited: string
  scope?:         string
  findings?:      string
  status:         AuditStatus
  createdBy:      string
}) {
  return db.transaction(async (tx) => {
    const [audit] = await tx
      .insert(auditLogs)
      .values({
        reference:      input.reference,
        auditorId:      input.auditorId,
        auditDate:      input.auditDate,
        processAudited: input.processAudited,
        scope:          input.scope,
        findings:       input.findings,
        status:         input.status,
        createdBy:      input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'MI',
      designation: `Audit interne — ${input.processAudited}`,
      department:  'qualite',
      category:    'rapport_audit',
      entityType:  'audit_log',
      entityId:    audit.id,
      authorId:    input.createdBy,
    })

    const [updated] = await tx
      .update(auditLogs)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(auditLogs.id, audit.id))
      .returning()

    return updated
  })
}

/**
 * Updates the editable fields of an internal audit.
 *
 * Editable: findings, scope, status, and completedAt (the latter only as part of
 * closing the audit — see below).
 *
 * Everything else on audit_logs is immutable or system-managed and is therefore
 * absent from the UPDATE by construction: `reference` is an issued identifier,
 * `auditDate` is fixed at creation by design, `auditorId` / `processAudited`
 * define what the record *is*, `dmsDocumentCode` is owned by the DMS, and
 * `id` / `createdAt` / `createdBy` are provenance.
 *
 * Fields are listed explicitly rather than spread from `input`: `...input` would
 * write any column a caller happened to include, so the data layer would depend
 * on every caller being well-behaved. The API route is careful today, but a
 * future server action or script need not be.
 */
export async function updateAudit(
  id: string,
  input: {
    findings?:    string
    status?:      AuditStatus
    completedAt?: Date
    scope?:       string
  }
) {
  const now = new Date()
  const [updated] = await db
    .update(auditLogs)
    .set({
      ...(input.findings !== undefined && { findings: input.findings }),
      ...(input.scope    !== undefined && { scope: input.scope }),
      ...(input.status   !== undefined && { status: input.status }),
      // Unchanged from the previous implementation: completedAt is stamped only
      // when the audit is being closed. A completedAt supplied without
      // status='completed' was already ignored and still is.
      ...(input.status === 'completed' && { completedAt: input.completedAt ?? now }),
      updatedAt: now,
    })
    .where(eq(auditLogs.id, id))
    .returning()
  return updated
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export async function getActiveUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
    .orderBy(asc(users.name))
}

/** Lightweight CAPA row fetch — only the columns needed for authorization. */
export async function getCapaById(capaId: string) {
  const [row] = await db
    .select({
      id:           correctiveActions.id,
      ncId:         correctiveActions.ncId,
      responsibleId: correctiveActions.responsibleId,
      createdBy:    correctiveActions.createdBy,
    })
    .from(correctiveActions)
    .where(eq(correctiveActions.id, capaId))
    .limit(1)
  return row ?? null
}

type SessionUser = { userId: string; role: string }

/**
 * Returns the NC if the caller is allowed to access it, or a typed error.
 *
 * Read access: any authenticated user (NCs are company-wide quality records).
 * Write access: admin | direction | the user who detected it | the user it's assigned to.
 */
export async function assertNcWriteAccess(
  ncId: string,
  user: SessionUser
): Promise<{ nc: NcDetail } | { error: 'NOT_FOUND' | 'FORBIDDEN' }> {
  const nc = await getNcById(ncId)
  if (!nc) return { error: 'NOT_FOUND' }

  const { userId, role } = user
  if (role === 'admin' || role === 'direction') return { nc }
  if (nc.detectedById === userId || nc.assignedToId === userId) return { nc }

  return { error: 'FORBIDDEN' }
}

/**
 * Validates that `assignedTo` is an active user whose role is compatible
 * with the affected process, and that `projectId` (if supplied) is a real project.
 * Returns null if valid, or an error string to return to the client.
 */
export async function validateNcInputRefs(opts: {
  assignedTo?:     string
  projectId?:      string
  processAffected?: string
}): Promise<string | null> {
  if (opts.assignedTo) {
    const [user] = await db
      .select({ id: users.id, isActive: users.isActive, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, opts.assignedTo))
      .limit(1)
    if (!user || !user.isActive || user.deletedAt) {
      return 'L\'utilisateur assigné est introuvable ou inactif'
    }
  }

  if (opts.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, opts.projectId), isNull(projects.deletedAt)))
      .limit(1)
    if (!project) return 'Projet introuvable'
  }

  return null
}

// ─── Audit Programs (FOR-MI-14) ───────────────────────────────────────────────

export type AuditProgramRow = {
  id: string
  reference: string
  year: number
  dept: string
  title: string | null
  auditorName: string | null
  auditeeResponsible: string | null
  scheduledDate: Date | null
  scheduledStartTime: string | null  // e.g. "09H00"
  scheduledEndTime: string | null    // e.g. "11H00"
  actualDate: Date | null
  auditorSignedAt: Date | null
  status: string
  scope: string | null
  objectives: string | null
  criteria: string | null            // ISO clause references e.g. "4.4; 6.1; 8.4"
  referenceDocuments: string | null  // e.g. "PRS-AC-01 & documents associés"
  findings: string | null
  reportAssetId: string | null
  reportUrl: string | null
  dmsDocumentCode: string | null
  notes: string | null
  createdAt: Date
}

export type AuditProgramItemRow = {
  id: string
  auditProgramId: string
  agendaStep: string             // Etapes du processus — e.g. "Revue des offres / contrats"
  clauseRef: string | null       // ISO clause(s) for this step
  interlocuteurs: string | null  // Who must attend — e.g. "Pilote processus & Collaborateurs"
  response: string | null
  conformity: string | null      // C / NC / NA / PA
  evidence: string | null
  /** NC raised from this finding, when one has been. */
  ncId: string | null
  ncReference: string | null
  sortOrder: number
}

/**
 * Next audit-programme reference, e.g. "AUD-AC-2026-02".
 *
 * Numbered per department and per year, preserving the existing format and
 * two-digit width. Each department keeps its own counter, so AC and RE1 never
 * consume each other's numbers.
 *
 * The year here is the **planned year** (from scheduledDate), unlike
 * generateAuditReference above which uses the registration year. The difference
 * is intentional: audit_programs persists a `year` column alongside the
 * reference, so the two must agree, and checkAuditProgramScheduleChange enforces
 * that on update.
 */
export async function generateAuditProgramReference(
  dept: string,
  year = new Date().getFullYear(),
): Promise<string> {
  const seq = await allocateReferenceNumber(
    `audit_program:${dept}`,
    year,
    sql`SELECT max(substring(reference from ${`^AUD-${dept}-${year}-([0-9]+)$`})::int)
        FROM audit_programs
        WHERE reference ~ ${'^AUD-[A-Z0-9]+-[0-9]{4}-[0-9]+$'}`,
  )
  return `AUD-${dept}-${year}-${String(seq).padStart(2, '0')}`
}

export async function listAuditPrograms(filters?: {
  year?: number
  dept?: NcDept
  status?: AuditProgramStatus
}): Promise<AuditProgramRow[]> {
  const rows = await db
    .select({
      id:                 auditPrograms.id,
      reference:          auditPrograms.reference,
      year:               auditPrograms.year,
      dept:               auditPrograms.dept,
      title:              auditPrograms.title,
      auditorName:        auditPrograms.auditorName,
      auditeeResponsible: auditPrograms.auditeeResponsible,
      scheduledDate:      auditPrograms.scheduledDate,
      scheduledStartTime: auditPrograms.scheduledStartTime,
      scheduledEndTime:   auditPrograms.scheduledEndTime,
      actualDate:         auditPrograms.actualDate,
      auditorSignedAt:    auditPrograms.auditorSignedAt,
      status:             auditPrograms.status,
      scope:              auditPrograms.scope,
      objectives:         auditPrograms.objectives,
      criteria:           auditPrograms.criteria,
      referenceDocuments: auditPrograms.referenceDocuments,
      findings:           auditPrograms.findings,
      reportAssetId:      auditPrograms.reportAssetId,
      reportUrl:          cloudinaryAssets.secureUrl,
      dmsDocumentCode:    auditPrograms.dmsDocumentCode,
      notes:              auditPrograms.notes,
      createdAt:          auditPrograms.createdAt,
    })
    .from(auditPrograms)
    .leftJoin(cloudinaryAssets, eq(auditPrograms.reportAssetId, cloudinaryAssets.id))
    .where(
      and(
        filters?.year   ? eq(auditPrograms.year, filters.year) : undefined,
        filters?.dept   ? eq(auditPrograms.dept, filters.dept as NcDept) : undefined,
        filters?.status ? eq(auditPrograms.status, filters.status as AuditProgramStatus) : undefined,
      )
    )
    .orderBy(desc(auditPrograms.scheduledDate))

  return rows as AuditProgramRow[]
}

export async function getAuditProgramById(id: string): Promise<(AuditProgramRow & { items: AuditProgramItemRow[] }) | null> {
  const [program] = await db
    .select({
      id:                 auditPrograms.id,
      reference:          auditPrograms.reference,
      year:               auditPrograms.year,
      dept:               auditPrograms.dept,
      title:              auditPrograms.title,
      auditorName:        auditPrograms.auditorName,
      auditeeResponsible: auditPrograms.auditeeResponsible,
      scheduledDate:      auditPrograms.scheduledDate,
      scheduledStartTime: auditPrograms.scheduledStartTime,
      scheduledEndTime:   auditPrograms.scheduledEndTime,
      actualDate:         auditPrograms.actualDate,
      auditorSignedAt:    auditPrograms.auditorSignedAt,
      status:             auditPrograms.status,
      scope:              auditPrograms.scope,
      objectives:         auditPrograms.objectives,
      criteria:           auditPrograms.criteria,
      referenceDocuments: auditPrograms.referenceDocuments,
      findings:           auditPrograms.findings,
      reportAssetId:      auditPrograms.reportAssetId,
      reportUrl:          cloudinaryAssets.secureUrl,
      dmsDocumentCode:    auditPrograms.dmsDocumentCode,
      notes:              auditPrograms.notes,
      createdAt:          auditPrograms.createdAt,
    })
    .from(auditPrograms)
    .leftJoin(cloudinaryAssets, eq(auditPrograms.reportAssetId, cloudinaryAssets.id))
    .where(eq(auditPrograms.id, id))
    .limit(1)

  if (!program) return null

  const items = await db
    .select({
      id:             auditProgramItems.id,
      auditProgramId: auditProgramItems.auditProgramId,
      agendaStep:     auditProgramItems.agendaStep,
      clauseRef:      auditProgramItems.clauseRef,
      interlocuteurs: auditProgramItems.interlocuteurs,
      response:       auditProgramItems.response,
      conformity:     auditProgramItems.conformity,
      evidence:       auditProgramItems.evidence,
      ncId:           auditProgramItems.ncId,
      ncReference:    sql<string | null>`nc_origin.reference`,
      sortOrder:      auditProgramItems.sortOrder,
    })
    .from(auditProgramItems)
    .leftJoin(sql`non_conformances nc_origin`, sql`nc_origin.id = ${auditProgramItems.ncId}`)
    .where(eq(auditProgramItems.auditProgramId, id))
    .orderBy(asc(auditProgramItems.sortOrder))

  return { ...program, items } as AuditProgramRow & { items: AuditProgramItemRow[] }
}

export async function createAuditProgram(input: {
  dept:                NcDept
  title?:              string
  auditorName?:        string
  auditeeResponsible?: string
  scheduledDate?:      Date
  scheduledStartTime?: string
  scheduledEndTime?:   string
  actualDate?:         Date
  auditorSignedAt?:    Date
  status?:             AuditProgramStatus
  scope?:              string
  objectives?:         string
  criteria?:           string
  referenceDocuments?: string
  findings?:           string
  reportAssetId?:      string
  notes?:              string
  createdBy:           string
}) {
  return db.transaction(async (tx) => {
    // One year for both the stored column and the reference. Computed first so
    // a programme created in December but scheduled for January is numbered in
    // the year it belongs to, rather than the year it happened to be entered.
    const year = input.scheduledDate ? input.scheduledDate.getFullYear() : new Date().getFullYear()
    const reference = await generateAuditProgramReference(input.dept, year)

    const [program] = await tx
      .insert(auditPrograms)
      .values({
        reference,
        year,
        dept:                input.dept,
        title:               input.title,
        auditorName:         input.auditorName,
        auditeeResponsible:  input.auditeeResponsible,
        scheduledDate:       input.scheduledDate,
        scheduledStartTime:  input.scheduledStartTime,
        scheduledEndTime:    input.scheduledEndTime,
        actualDate:          input.actualDate,
        auditorSignedAt:     input.auditorSignedAt,
        status:              input.status ?? 'planifie',
        scope:               input.scope,
        objectives:          input.objectives,
        criteria:            input.criteria,
        referenceDocuments:  input.referenceDocuments,
        findings:            input.findings,
        reportAssetId:       input.reportAssetId || null,
        notes:               input.notes,
        createdBy:           input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'MI',
      designation: input.title ?? `Programme audit ${input.dept} ${year}`,
      department:  'qualite',
      category:    'rapport_audit',
      entityType:  'audit_program',
      entityId:    program.id,
      authorId:    input.createdBy,
    })

    await tx.update(auditPrograms).set({ dmsDocumentCode: dmsCode }).where(eq(auditPrograms.id, program.id))

    return { ...program, dmsDocumentCode: dmsCode }
  })
}

export type AuditProgramScheduleCheck = {
  ok: boolean
  reason: string | null
}

/**
 * Guards the audit-programme year invariant on update.
 *
 * A programme's reference embeds the year it was issued for (AUD-DEPT-YYYY-NN)
 * and references are immutable once issued, so moving the scheduled date across
 * a calendar-year boundary would leave the stored `year` and the reference
 * disagreeing. Rescheduling within the same year is unaffected.
 *
 * Records that are *already* inconsistent — a legacy row whose scheduled year
 * never matched its `year` column — are deliberately let through rather than
 * repaired or frozen: silently rewriting historical data is worse than leaving
 * it as recorded, and blocking every edit would trap the row with no way out
 * (`year` is not editable through the API).
 */
export async function checkAuditProgramScheduleChange(
  id: string,
  newScheduledDate: Date | null | undefined,
): Promise<AuditProgramScheduleCheck> {
  // Not part of this update, or the date is being cleared: nothing to check.
  if (newScheduledDate === undefined || newScheduledDate === null) {
    return { ok: true, reason: null }
  }

  const [existing] = await db
    .select({
      year: auditPrograms.year,
      reference: auditPrograms.reference,
      scheduledDate: auditPrograms.scheduledDate,
    })
    .from(auditPrograms)
    .where(eq(auditPrograms.id, id))
    .limit(1)

  if (!existing) return { ok: false, reason: 'Programme introuvable' }

  const alreadyInconsistent =
    existing.scheduledDate !== null &&
    existing.scheduledDate.getFullYear() !== existing.year
  if (alreadyInconsistent) return { ok: true, reason: null }

  const newYear = newScheduledDate.getFullYear()
  if (newYear === existing.year) return { ok: true, reason: null }

  return {
    ok: false,
    reason:
      `La date planifiée ne peut pas changer d'année : la référence ${existing.reference} ` +
      `est déjà attribuée à l'année ${existing.year} et une référence émise est immuable. ` +
      `Replanifiez à l'intérieur de ${existing.year}, ou créez un nouveau programme pour ${newYear}.`,
  }
}

export async function updateAuditProgram(id: string, input: {
  title?:              string | null
  auditorName?:        string | null
  auditeeResponsible?: string | null
  scheduledDate?:      Date | null
  scheduledStartTime?: string | null
  scheduledEndTime?:   string | null
  actualDate?:         Date | null
  auditorSignedAt?:    Date | null
  status?:             AuditProgramStatus
  scope?:              string | null
  objectives?:         string | null
  criteria?:           string | null
  referenceDocuments?: string | null
  findings?:           string | null
  reportAssetId?:      string | null
  notes?:              string | null
}) {
  // Fields are picked explicitly rather than spread: `...input` would let any
  // caller write columns absent from the signature — `year` and `reference`
  // among them — which is exactly the year/reference divergence this module
  // guards against elsewhere.
  const [updated] = await db
    .update(auditPrograms)
    .set({
      ...(input.title              !== undefined && { title: input.title }),
      ...(input.auditorName        !== undefined && { auditorName: input.auditorName }),
      ...(input.auditeeResponsible !== undefined && { auditeeResponsible: input.auditeeResponsible }),
      ...(input.scheduledDate      !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.scheduledStartTime !== undefined && { scheduledStartTime: input.scheduledStartTime }),
      ...(input.scheduledEndTime   !== undefined && { scheduledEndTime: input.scheduledEndTime }),
      ...(input.actualDate         !== undefined && { actualDate: input.actualDate }),
      ...(input.auditorSignedAt    !== undefined && { auditorSignedAt: input.auditorSignedAt }),
      ...(input.status             !== undefined && { status: input.status }),
      ...(input.scope              !== undefined && { scope: input.scope }),
      ...(input.objectives         !== undefined && { objectives: input.objectives }),
      ...(input.criteria           !== undefined && { criteria: input.criteria }),
      ...(input.referenceDocuments !== undefined && { referenceDocuments: input.referenceDocuments }),
      ...(input.findings           !== undefined && { findings: input.findings }),
      ...(input.reportAssetId      !== undefined && { reportAssetId: input.reportAssetId }),
      ...(input.notes              !== undefined && { notes: input.notes }),
      updatedAt: new Date(),
    })
    .where(eq(auditPrograms.id, id))
    .returning()
  return updated
}

export async function upsertAuditProgramItems(
  auditProgramId: string,
  items: Array<{
    /** Existing row id, round-tripped by the client so its NC link survives. */
    id?:             string
    agendaStep:      string
    clauseRef?:      string
    interlocuteurs?: string
    response?:       string
    conformity?:     string
    evidence?:       string
    sortOrder?:      number
  }>,
  createdBy: string
) {
  // This function replaces the whole item set, so a finding's link to the NC it
  // raised would be destroyed on every save. The link is read from the database
  // by row id and carried forward — never taken from the payload, so a caller
  // cannot attach an arbitrary NC to a finding through this path.
  const existing = await db
    .select({ id: auditProgramItems.id, ncId: auditProgramItems.ncId })
    .from(auditProgramItems)
    .where(eq(auditProgramItems.auditProgramId, auditProgramId))
  const ncByItemId = new Map(existing.filter((e) => e.ncId).map((e) => [e.id, e.ncId]))

  await db.delete(auditProgramItems).where(eq(auditProgramItems.auditProgramId, auditProgramId))

  if (items.length === 0) return []

  const rows = await db
    .insert(auditProgramItems)
    .values(
      items.map((item, i) => ({
        auditProgramId,
        agendaStep:     item.agendaStep,
        clauseRef:      item.clauseRef,
        interlocuteurs: item.interlocuteurs,
        response:       item.response,
        conformity:     item.conformity,
        evidence:       item.evidence,
        ncId:           item.id ? ncByItemId.get(item.id) ?? null : null,
        sortOrder:      item.sortOrder ?? i,
        createdBy,
      }))
    )
    .returning()

  return rows
}

// ─── Audit finding → NC traceability ─────────────────────────────────────────

export type AuditFindingOrigin = {
  itemId:        string
  agendaStep:    string
  clauseRef:     string | null
  conformity:    string | null
  evidence:      string | null
  response:      string | null
  programId:     string
  programRef:    string
  programDept:   string
  programYear:   number
}

/**
 * The audit finding an NC was raised from, or null when it has another origin.
 *
 * Navigation is a reverse lookup rather than a second column on the NC: one
 * pointer means the two records cannot drift out of agreement, and the finding's
 * clause reference stays readable from the NC without being copied.
 */
export async function getNcOriginFinding(ncId: string): Promise<AuditFindingOrigin | null> {
  const [row] = await db
    .select({
      itemId:      auditProgramItems.id,
      agendaStep:  auditProgramItems.agendaStep,
      clauseRef:   auditProgramItems.clauseRef,
      conformity:  auditProgramItems.conformity,
      evidence:    auditProgramItems.evidence,
      response:    auditProgramItems.response,
      programId:   auditPrograms.id,
      programRef:  auditPrograms.reference,
      programDept: auditPrograms.dept,
      programYear: auditPrograms.year,
    })
    .from(auditProgramItems)
    .innerJoin(auditPrograms, eq(auditPrograms.id, auditProgramItems.auditProgramId))
    .where(eq(auditProgramItems.ncId, ncId))
    .limit(1)
  return (row as AuditFindingOrigin | undefined) ?? null
}

export type FindingNcResult =
  | { ok: true; ncId: string; reference: string }
  | { ok: false; reason: string; existingNcId?: string }

/**
 * Raises a non-conformity from an audit finding and links the two.
 *
 * The NC is created through createNc, so reference generation, the DMS code and
 * the audit trail behave exactly as they do for any other NC — and so the
 * closure rules (evidence + effectiveness verification) apply unchanged.
 *
 * A finding may raise only one NC: the link is single-valued and this function
 * refuses when it is already set, returning the existing NC rather than a second.
 */
export async function createNcFromAuditFinding(input: {
  itemId:      string
  description?: string
  ncType?:     string
  assignedTo?: string
  detectedBy:  string
  createdBy:   string
  actor?:      AuditActor
}): Promise<FindingNcResult> {
  const [finding] = await db
    .select({
      id:         auditProgramItems.id,
      ncId:       auditProgramItems.ncId,
      agendaStep: auditProgramItems.agendaStep,
      clauseRef:  auditProgramItems.clauseRef,
      response:   auditProgramItems.response,
      conformity: auditProgramItems.conformity,
      programRef: auditPrograms.reference,
      dept:       auditPrograms.dept,
      auditor:    auditPrograms.auditorName,
      scheduled:  auditPrograms.scheduledDate,
    })
    .from(auditProgramItems)
    .innerJoin(auditPrograms, eq(auditPrograms.id, auditProgramItems.auditProgramId))
    .where(eq(auditProgramItems.id, input.itemId))
    .limit(1)

  if (!finding) return { ok: false, reason: 'Constat introuvable' }
  if (finding.ncId) {
    return {
      ok: false,
      reason: 'Une non-conformité a déjà été créée à partir de ce constat.',
      existingNcId: finding.ncId,
    }
  }

  const description = (input.description ?? '').trim() || [
    finding.agendaStep,
    finding.response,
  ].filter(Boolean).join(' — ')

  if (description.length < 10) {
    return { ok: false, reason: 'Description trop courte pour ouvrir une non-conformité' }
  }

  const reference = await generateNcReference()
  const nc = await createNc({
    reference,
    description,
    // The clause reference stays on the finding and is reachable through the
    // link; it is echoed here so the NC register reads correctly on its own.
    referenceDoc:    finding.clauseRef ?? undefined,
    dept:            finding.dept,
    ncSource:        'audit',
    ncType:          input.ncType ?? 'systeme',
    ownerType:       'interne',
    auditorName:     finding.auditor ?? undefined,
    detectorName:    finding.auditor ?? undefined,
    detectedAt:      finding.scheduled ?? undefined,
    assignedTo:      input.assignedTo,
    detectedBy:      input.detectedBy,
    createdBy:       input.createdBy,
    actor:           input.actor,
  })

  await db
    .update(auditProgramItems)
    .set({ ncId: nc.id, updatedAt: new Date() })
    .where(eq(auditProgramItems.id, input.itemId))

  return { ok: true, ncId: nc.id, reference }
}
