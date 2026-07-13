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
} from '../../../db/schema'
import { eq, and, isNull, desc, asc, sql, ilike, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { attachDmsCode } from '../dms/attach'
import { obsoleteDmsDocument } from '../dms/obsolete'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NcStatus = 'open' | 'in_progress' | 'closed' | 'verified'
export type NcProcess = 'etudes' | 'realisation' | 'entretien'
export type NcSource = 'interne' | 'audit' | 'reclamation_client' | 'reclamation_pi'
export type NcDept = 'AC' | 'CO' | 'ET' | 'MI' | 'RE1' | 'RE2' | 'RH'
export type CapaStatus = 'open' | 'in_progress' | 'closed'
export type DocumentStatus = 'draft' | 'active' | 'obsolete'
export type DocumentCategory = 'procedure' | 'instruction' | 'formulaire' | 'enregistrement' | 'autre'
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed'
export type AuditProgramStatus = 'planifie' | 'en_cours' | 'realise' | 'reporte' | 'annule'

// ─── NC reference generator ───────────────────────────────────────────────────

export async function generateNcReference(): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(nonConformances)
    .where(sql`extract(year from created_at) = ${year}`)
  const seq = Number(count) + 1
  return `NC-${year}-${String(seq).padStart(3, '0')}`
}

export async function generateAuditReference(): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(sql`extract(year from created_at) = ${year}`)
  const seq = Number(count) + 1
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
  correctionProgress: number | null
  isRisk: boolean | null
  isOpportunity: boolean | null
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
      correctionProgress:        nonConformances.correctionProgress,
      isRisk:                    nonConformances.isRisk,
      isOpportunity:             nonConformances.isOpportunity,
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

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(nonConformances)
    .where(and(isNull(nonConformances.deletedAt), filters?.status ? eq(nonConformances.status, filters.status) : undefined))

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
  correctionProgress: number | null
  correctionStatus: string | null
  evalDatePlanned: Date | null
  evalDateActual: Date | null
  clientResponse: string | null
  clientResponseRef: string | null
  isRisk: boolean | null
  isOpportunity: boolean | null
  needsSecondCapa: boolean | null
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
  createdAt: Date
  dmsDocumentCode: string | null
  capa: CapaDetail[]
}

export type CapaDetail = {
  id: string
  actionDescription: string
  responsibleId: string
  responsibleName: string | null
  deadline: Date | null
  deadlinePlanned: Date | null
  deadlineActual: Date | null
  evalDatePlanned: Date | null
  evalDateActual: Date | null
  progressStatus: string | null
  status: string
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
      correctionProgress:        nonConformances.correctionProgress,
      correctionStatus:          nonConformances.correctionStatus,
      evalDatePlanned:           nonConformances.evalDatePlanned,
      evalDateActual:            nonConformances.evalDateActual,
      clientResponse:            nonConformances.clientResponse,
      clientResponseRef:         nonConformances.clientResponseRef,
      isRisk:                    nonConformances.isRisk,
      isOpportunity:             nonConformances.isOpportunity,
      needsSecondCapa:           nonConformances.needsSecondCapa,
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
      createdAt:                 nonConformances.createdAt,
      dmsDocumentCode:           nonConformances.dmsDocumentCode,
    })
    .from(nonConformances)
    .leftJoin(projects, eq(nonConformances.projectId, projects.id))
    .leftJoin(detUser,  eq(detUser.id,  nonConformances.detectedBy))
    .leftJoin(asgnUser, eq(asgnUser.id, nonConformances.assignedTo))
    .leftJoin(clsUser,  eq(clsUser.id,  nonConformances.closedBy))
    .where(and(eq(nonConformances.id, id), isNull(nonConformances.deletedAt)))
    .limit(1)

  if (!nc) return null

  const capas = await db
    .select({
      id:                    correctiveActions.id,
      actionDescription:     correctiveActions.actionDescription,
      responsibleId:         correctiveActions.responsibleId,
      responsibleName:       sql<string | null>`resp.name`,
      deadline:              correctiveActions.deadline,
      deadlinePlanned:       correctiveActions.deadlinePlanned,
      deadlineActual:        correctiveActions.deadlineActual,
      evalDatePlanned:       correctiveActions.evalDatePlanned,
      evalDateActual:        correctiveActions.evalDateActual,
      progressStatus:        correctiveActions.progressStatus,
      status:                correctiveActions.status,
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
  correctionProgress?:        number
  correctionStatus?:          string
  evalDatePlanned?:           Date
  evalDateActual?:            Date
  clientResponse?:            string
  clientResponseRef?:         string
  isRisk?:                    boolean
  isOpportunity?:             boolean
  needsSecondCapa?:           boolean
  assignedTo?:                string
  deadline?:                  Date
  beforePhotoAssetId?:        string
  afterPhotoAssetId?:         string
  detectedBy:                 string
  createdBy:                  string
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
        correctionProgress:         input.correctionProgress ?? null,
        correctionStatus:           input.correctionStatus,
        evalDatePlanned:            input.evalDatePlanned,
        evalDateActual:             input.evalDateActual,
        clientResponse:             input.clientResponse,
        clientResponseRef:          input.clientResponseRef ?? null,
        isRisk:                     input.isRisk ?? false,
        isOpportunity:              input.isOpportunity ?? false,
        needsSecondCapa:            input.needsSecondCapa ?? false,
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

    return { ...nc, dmsDocumentCode: dmsCode }
  })
}

export async function updateNcStatus(
  id: string,
  status: NcStatus,
  actorId: string,
  opts?: { rootCause?: string; closedAt?: Date }
) {
  const now = new Date()
  await db
    .update(nonConformances)
    .set({
      status,
      rootCause:  opts?.rootCause,
      closedAt:   status === 'closed' || status === 'verified' ? (opts?.closedAt ?? now) : null,
      closedBy:   status === 'closed' || status === 'verified' ? actorId : null,
      updatedAt:  now,
    })
    .where(eq(nonConformances.id, id))
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
    correctionStatus?:          string | null
    evalDatePlanned?:           Date | null
    evalDateActual?:            Date | null
    clientResponse?:            string | null
    isRisk?:                    boolean | null
    isOpportunity?:             boolean | null
    needsSecondCapa?:           boolean | null
    assignedTo?:                string | null
    deadline?:                  Date | null
    rootCause?:                 string | null
  }
) {
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
      ...(fields.correctionStatus        !== undefined && { correctionStatus: fields.correctionStatus }),
      ...(fields.evalDatePlanned         !== undefined && { evalDatePlanned: fields.evalDatePlanned }),
      ...(fields.evalDateActual          !== undefined && { evalDateActual: fields.evalDateActual }),
      ...(fields.clientResponse          !== undefined && { clientResponse: fields.clientResponse }),
      ...(fields.isRisk                  !== undefined && { isRisk: fields.isRisk }),
      ...(fields.isOpportunity           !== undefined && { isOpportunity: fields.isOpportunity }),
      ...(fields.needsSecondCapa         !== undefined && { needsSecondCapa: fields.needsSecondCapa }),
      ...(fields.assignedTo              !== undefined && { assignedTo: fields.assignedTo }),
      ...(fields.deadline                !== undefined && { deadline: fields.deadline }),
      ...(fields.rootCause               !== undefined && { rootCause: fields.rootCause }),
      updatedAt: new Date(),
    })
    .where(eq(nonConformances.id, id))
}

export async function softDeleteNc(id: string, actorId: string): Promise<boolean> {
  const result = await db
    .update(nonConformances)
    .set({ deletedAt: new Date() })
    .where(and(eq(nonConformances.id, id), isNull(nonConformances.deletedAt)))
    .returning({ id: nonConformances.id, dmsDocumentCode: nonConformances.dmsDocumentCode })
  if (result.length === 0) return false
  const code = result[0].dmsDocumentCode
  if (code) await obsoleteDmsDocument(db, code, actorId)
  return true
}

export async function softDeleteCapa(id: string, ncId: string, actorId: string): Promise<boolean> {
  const result = await db
    .update(correctiveActions)
    .set({ status: 'closed' })
    .where(and(eq(correctiveActions.id, id), eq(correctiveActions.ncId, ncId)))
    .returning({ id: correctiveActions.id, dmsDocumentCode: correctiveActions.dmsDocumentCode })
  if (result.length === 0) return false
  const code = result[0].dmsDocumentCode
  if (code) await obsoleteDmsDocument(db, code, actorId)
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
  responsibleId:     string
  responsibleName?:  string
  deadlinePlanned?:  Date
  deadlineActual?:   Date
  deadline?:         Date
  evalDatePlanned?:  Date
  evalDateActual?:   Date
  progressStatus?:   string
  notes?:            string
  createdBy:         string
}) {
  return db.transaction(async (tx) => {
    const [capa] = await tx
      .insert(correctiveActions)
      .values({
        ncId:              input.ncId,
        actionDescription: input.actionDescription,
        responsibleId:     input.responsibleId,
        responsibleName:   input.responsibleName,
        deadlinePlanned:   input.deadlinePlanned,
        deadlineActual:    input.deadlineActual,
        deadline:          input.deadlinePlanned ?? input.deadline,
        evalDatePlanned:   input.evalDatePlanned,
        evalDateActual:    input.evalDateActual,
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

    return { ...capa, dmsDocumentCode: dmsCode }
  })
}

export async function updateCapa(
  capaId: string,
  input: {
    actionDescription?: string
    responsibleName?:   string
    deadlinePlanned?:   Date | null
    deadlineActual?:    Date | null
    evalDatePlanned?:   Date | null
    evalDateActual?:    Date | null
    progressStatus?:    string | null
    status?:            CapaStatus
    evidenceAssetId?:   string
    effectivenessVerified?: boolean
    verifiedBy?:        string
    closedAt?:          Date
    notes?:             string
  }
) {
  const now = new Date()
  const [updated] = await db
    .update(correctiveActions)
    .set({
      ...(input.actionDescription !== undefined && { actionDescription: input.actionDescription }),
      ...(input.responsibleName   !== undefined && { responsibleName: input.responsibleName }),
      ...(input.deadlinePlanned   !== undefined && { deadlinePlanned: input.deadlinePlanned, deadline: input.deadlinePlanned }),
      ...(input.deadlineActual    !== undefined && { deadlineActual: input.deadlineActual }),
      ...(input.evalDatePlanned   !== undefined && { evalDatePlanned: input.evalDatePlanned }),
      ...(input.evalDateActual    !== undefined && { evalDateActual: input.evalDateActual }),
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
  return updated
}

/** Check closure prerequisites for an NC (ISO independence rule). */
export async function checkNcClosePrerequisites(ncId: string, actorId: string) {
  const nc = await getNcById(ncId)
  if (!nc) return { ok: false, reason: 'NC introuvable' }

  const hasCapa = nc.capa.length > 0
  const hasEvidence = nc.capa.some((c) => c.evidenceAssetId !== null)
  const hasVerification = nc.capa.some((c) => c.effectivenessVerified)
  // ISO independence: verifier must differ from creator
  const verifierIsIndependent = nc.capa.every(
    (c) => !c.verifiedById || c.verifiedById !== nc.detectedById
  )

  if (!hasCapa)           return { ok: false, reason: 'Aucune action corrective n\'a été créée' }
  if (!hasEvidence)       return { ok: false, reason: 'Aucune preuve d\'action corrective n\'a été téléchargée' }
  if (!hasVerification)   return { ok: false, reason: 'L\'efficacité de l\'action corrective n\'a pas été vérifiée' }
  if (!verifierIsIndependent) return { ok: false, reason: 'Le vérificateur doit être différent du détecteur de la NC (indépendance ISO 9001)' }

  return { ok: true, reason: null }
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
      ...input,
      completedAt: input.status === 'completed' ? (input.completedAt ?? now) : undefined,
      updatedAt:   now,
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
  sortOrder: number
}

export async function generateAuditProgramReference(dept: string): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditPrograms)
    .where(sql`extract(year from created_at) = ${year} AND dept = ${dept}::nc_dept`)
  const seq = Number(count) + 1
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
      sortOrder:      auditProgramItems.sortOrder,
    })
    .from(auditProgramItems)
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
    const reference = await generateAuditProgramReference(input.dept)
    const year = input.scheduledDate ? input.scheduledDate.getFullYear() : new Date().getFullYear()

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
  const [updated] = await db
    .update(auditPrograms)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(auditPrograms.id, id))
    .returning()
  return updated
}

export async function upsertAuditProgramItems(
  auditProgramId: string,
  items: Array<{
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
        sortOrder:      item.sortOrder ?? i,
        createdBy,
      }))
    )
    .returning()

  return rows
}
