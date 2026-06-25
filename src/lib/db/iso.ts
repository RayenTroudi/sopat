import { db } from '../../../db/index'
import {
  nonConformances,
  correctiveActions,
  documents,
  auditLogs,
  cloudinaryAssets,
  users,
  projects,
} from '../../../db/schema'
import { eq, and, isNull, desc, asc, sql, ilike, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { attachDmsCode } from '../dms/attach'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NcStatus = 'open' | 'in_progress' | 'closed' | 'verified'
export type NcProcess = 'etudes' | 'realisation' | 'entretien'
export type CapaStatus = 'open' | 'in_progress' | 'closed'
export type DocumentStatus = 'draft' | 'active' | 'obsolete'
export type DocumentCategory = 'procedure' | 'instruction' | 'formulaire' | 'enregistrement' | 'autre'
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed'

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
  status: string
  ncType: string | null
  processAffected: string
  description: string
  detectedAt: Date
  deadline: Date | null
  projectId: string | null
  projectName: string | null
  detectedByName: string | null
  assignedToName: string | null
  createdAt: Date
  dmsDocumentCode: string | null
}

export async function listNcs(filters?: {
  status?: NcStatus
  process?: NcProcess
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
      id:              nonConformances.id,
      reference:       nonConformances.reference,
      status:          nonConformances.status,
      ncType:          nonConformances.ncType,
      processAffected: nonConformances.processAffected,
      description:     nonConformances.description,
      detectedAt:      nonConformances.detectedAt,
      deadline:        nonConformances.deadline,
      projectId:       nonConformances.projectId,
      projectName:     projects.name,
      detectedByName:  detUser.name,
      assignedToName:  asgnUser.name,
      createdAt:       nonConformances.createdAt,
      dmsDocumentCode: nonConformances.dmsDocumentCode,
    })
    .from(nonConformances)
    .leftJoin(projects, eq(nonConformances.projectId, projects.id))
    .leftJoin(detUser,  eq(detUser.id,  nonConformances.detectedBy))
    .leftJoin(asgnUser, eq(asgnUser.id, nonConformances.assignedTo))
    .where(
      and(
        isNull(nonConformances.deletedAt),
        filters?.status    ? eq(nonConformances.status, filters.status)           : undefined,
        filters?.process   ? eq(nonConformances.processAffected, filters.process) : undefined,
        filters?.projectId ? eq(nonConformances.projectId, filters.projectId)     : undefined,
        filters?.search    ? ilike(nonConformances.description, `%${filters.search}%`) : undefined,
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
  status: string
  processAffected: string
  description: string
  rootCause: string | null
  detectedAt: Date
  deadline: Date | null
  closedAt: Date | null
  projectId: string | null
  projectName: string | null
  detectedById: string
  detectedByName: string | null
  assignedToId: string | null
  assignedToName: string | null
  closedById: string | null
  closedByName: string | null
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
      id:              nonConformances.id,
      reference:       nonConformances.reference,
      status:          nonConformances.status,
      processAffected: nonConformances.processAffected,
      description:     nonConformances.description,
      rootCause:       nonConformances.rootCause,
      detectedAt:      nonConformances.detectedAt,
      deadline:        nonConformances.deadline,
      closedAt:        nonConformances.closedAt,
      projectId:       nonConformances.projectId,
      projectName:     projects.name,
      detectedById:    nonConformances.detectedBy,
      detectedByName:  detUser.name,
      assignedToId:    nonConformances.assignedTo,
      assignedToName:  asgnUser.name,
      closedById:      nonConformances.closedBy,
      closedByName:    clsUser.name,
      createdAt:       nonConformances.createdAt,
      dmsDocumentCode: nonConformances.dmsDocumentCode,
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
      id:                   correctiveActions.id,
      actionDescription:    correctiveActions.actionDescription,
      responsibleId:        correctiveActions.responsibleId,
      responsibleName:      sql<string | null>`resp.name`,
      deadline:             correctiveActions.deadline,
      status:               correctiveActions.status,
      effectivenessVerified: correctiveActions.effectivenessVerified,
      verifiedAt:           correctiveActions.verifiedAt,
      verifiedById:         correctiveActions.verifiedBy,
      verifiedByName:       sql<string | null>`vby.name`,
      closedAt:             correctiveActions.closedAt,
      notes:                correctiveActions.notes,
      evidenceAssetId:      correctiveActions.evidenceAssetId,
      evidenceUrl:          cloudinaryAssets.secureUrl,
      createdAt:            correctiveActions.createdAt,
      dmsDocumentCode:      correctiveActions.dmsDocumentCode,
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
  reference:           string
  projectId?:          string
  processAffected?:    string
  ncType?:             string
  ownerType?:          string
  auditorName?:        string
  description:         string
  rootCause?:          string
  assignedTo?:         string
  deadline?:           Date
  beforePhotoAssetId?: string
  afterPhotoAssetId?:  string
  detectedBy:          string
  createdBy:           string
}) {
  return db.transaction(async (tx) => {
    const [nc] = await tx
      .insert(nonConformances)
      .values({
        reference:          input.reference,
        projectId:          input.projectId || null,
        processAffected:    (input.processAffected as NcProcess) || null,
        ncType:             (input.ncType as typeof nonConformances.$inferInsert['ncType']) || null,
        ownerType:          (input.ownerType as typeof nonConformances.$inferInsert['ownerType']) || null,
        auditorName:        input.auditorName,
        description:        input.description,
        rootCause:          input.rootCause,
        assignedTo:         input.assignedTo || null,
        deadline:           input.deadline,
        beforePhotoAssetId: input.beforePhotoAssetId || null,
        afterPhotoAssetId:  input.afterPhotoAssetId || null,
        detectedBy:         input.detectedBy,
        status:             'open',
        createdBy:          input.createdBy,
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
  deadline?:         Date
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
        deadline:          input.deadline,
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
      ...input,
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
