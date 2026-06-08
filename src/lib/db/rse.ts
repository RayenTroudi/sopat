import { db } from '../../../db/index'
import {
  rsePartnerships,
  rsePartnershipCommitments,
  rsePartnershipCommunications,
  rseActivityLog,
  cloudinaryAssets,
  users,
} from '../../../db/schema'
import { eq, and, desc, asc, sql, lt, lte } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RsePartnerType = 'hotel' | 'municipalite' | 'entreprise' | 'institution' | 'autre'
export type RsePartnershipStatus = 'actif' | 'expire' | 'resilie' | 'en_cours_de_negociation'
export type RseCommitmentType = 'action_annuelle' | 'sensibilisation' | 'communication' | 'projet_paysager' | 'autre'
export type RseCommitmentFrequency = 'unique' | 'annuel' | 'semestriel' | 'trimestriel' | 'mensuel'
export type RseResponsibleParty = 'sopat' | 'partenaire' | 'conjoint'
export type RseCommitmentStatus = 'respecte' | 'en_retard' | 'a_venir'
export type RseCommunicationType = 'logo_sopat' | 'logo_partenaire' | 'publication_commune'
export type RseCommunicationValidation = 'en_attente' | 'approuve' | 'refuse'

export type RsePartnershipListItem = {
  id: string
  conventionReference: string
  partnerName: string
  partnerType: RsePartnerType
  sopatReferentId: string
  sopatReferentName: string | null
  startDate: Date | null
  endDate: Date | null
  status: RsePartnershipStatus
  autoRenewal: boolean
  noticePeriodDays: number
  hasOverdueCommitments: boolean
  createdAt: Date
}

export type RsePartnershipDetail = {
  id: string
  conventionReference: string
  partnerName: string
  partnerType: RsePartnerType
  partnerAddress: string | null
  partnerContactName: string | null
  partnerContactEmail: string | null
  partnerContactPhone: string | null
  sopatReferentId: string
  sopatReferentName: string | null
  sopatReferentEmail: string | null
  partnerReferentName: string | null
  signedDate: Date | null
  startDate: Date | null
  endDate: Date | null
  autoRenewal: boolean
  noticePeriodDays: number
  status: RsePartnershipStatus
  conventionPdfCloudinaryId: string | null
  conventionPdfUrl: string | null
  conventionPdfPublicId: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type RseCommitment = typeof rsePartnershipCommitments.$inferSelect
export type RseCommunication = typeof rsePartnershipCommunications.$inferSelect & {
  submittedByName: string | null
  assetUrl: string | null
  assetPublicId: string | null
}

// ─── Reference generator ──────────────────────────────────────────────────────

export async function generateConventionReference(): Promise<string> {
  const year = new Date().getFullYear()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsePartnerships)
    .where(sql`extract(year from created_at) = ${year}`)
  const seq = Number(count) + 1
  return `RSE-${year}-${String(seq).padStart(3, '0')}`
}

// ─── Next due date calculator ─────────────────────────────────────────────────

export function calcNextDueDate(frequency: RseCommitmentFrequency, from: Date): Date | null {
  const d = new Date(from)
  switch (frequency) {
    case 'unique':      return null
    case 'mensuel':     d.setMonth(d.getMonth() + 1); break
    case 'trimestriel': d.setMonth(d.getMonth() + 3); break
    case 'semestriel':  d.setMonth(d.getMonth() + 6); break
    case 'annuel':      d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

// ─── Activity log ─────────────────────────────────────────────────────────────

export async function logRseActivity({
  partnershipId,
  actorId,
  actorName,
  action,
  previousState,
  newState,
  metadata,
}: {
  partnershipId: string
  actorId: string
  actorName: string
  action: string
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}) {
  await db.insert(rseActivityLog).values({
    partnershipId,
    actorId,
    actorName,
    action,
    previousState: previousState ?? null,
    newState: newState ?? null,
    metadata: metadata ?? null,
    createdBy: actorId,
  })
}

// ─── Partnership queries ──────────────────────────────────────────────────────

export async function listRsePartnerships(filters?: {
  status?: RsePartnershipStatus
  partnerType?: RsePartnerType
}): Promise<RsePartnershipListItem[]> {
  const rows = await db
    .select({
      id: rsePartnerships.id,
      conventionReference: rsePartnerships.conventionReference,
      partnerName: rsePartnerships.partnerName,
      partnerType: rsePartnerships.partnerType,
      sopatReferentId: rsePartnerships.sopatReferentId,
      sopatReferentName: users.name,
      startDate: rsePartnerships.startDate,
      endDate: rsePartnerships.endDate,
      status: rsePartnerships.status,
      autoRenewal: rsePartnerships.autoRenewal,
      noticePeriodDays: rsePartnerships.noticePeriodDays,
      createdAt: rsePartnerships.createdAt,
    })
    .from(rsePartnerships)
    .leftJoin(users, eq(users.id, rsePartnerships.sopatReferentId))
    .where(
      and(
        filters?.status ? eq(rsePartnerships.status, filters.status) : undefined,
        filters?.partnerType ? eq(rsePartnerships.partnerType, filters.partnerType) : undefined,
      )
    )
    .orderBy(desc(rsePartnerships.createdAt))

  // Check overdue commitments for each partnership
  const overduePartnershipIds = new Set<string>()
  if (rows.length > 0) {
    const now = new Date()
    const overdueRows = await db
      .select({ partnershipId: rsePartnershipCommitments.partnershipId })
      .from(rsePartnershipCommitments)
      .where(
        and(
          eq(rsePartnershipCommitments.status, 'en_retard'),
        )
      )
    for (const r of overdueRows) overduePartnershipIds.add(r.partnershipId)
    // Also compute from nextDueDate < now for freshness
    const computedOverdue = await db
      .select({ partnershipId: rsePartnershipCommitments.partnershipId })
      .from(rsePartnershipCommitments)
      .where(lt(rsePartnershipCommitments.nextDueDate, now))
    for (const r of computedOverdue) overduePartnershipIds.add(r.partnershipId)
  }

  return rows.map((r) => ({
    ...r,
    partnerType: r.partnerType as RsePartnerType,
    status: r.status as RsePartnershipStatus,
    hasOverdueCommitments: overduePartnershipIds.has(r.id),
  }))
}

export async function getRsePartnership(id: string): Promise<RsePartnershipDetail | null> {
  const [row] = await db
    .select({
      id: rsePartnerships.id,
      conventionReference: rsePartnerships.conventionReference,
      partnerName: rsePartnerships.partnerName,
      partnerType: rsePartnerships.partnerType,
      partnerAddress: rsePartnerships.partnerAddress,
      partnerContactName: rsePartnerships.partnerContactName,
      partnerContactEmail: rsePartnerships.partnerContactEmail,
      partnerContactPhone: rsePartnerships.partnerContactPhone,
      sopatReferentId: rsePartnerships.sopatReferentId,
      sopatReferentName: users.name,
      sopatReferentEmail: users.email,
      partnerReferentName: rsePartnerships.partnerReferentName,
      signedDate: rsePartnerships.signedDate,
      startDate: rsePartnerships.startDate,
      endDate: rsePartnerships.endDate,
      autoRenewal: rsePartnerships.autoRenewal,
      noticePeriodDays: rsePartnerships.noticePeriodDays,
      status: rsePartnerships.status,
      conventionPdfCloudinaryId: rsePartnerships.conventionPdfCloudinaryId,
      conventionPdfUrl: cloudinaryAssets.secureUrl,
      conventionPdfPublicId: cloudinaryAssets.publicId,
      notes: rsePartnerships.notes,
      createdAt: rsePartnerships.createdAt,
      updatedAt: rsePartnerships.updatedAt,
    })
    .from(rsePartnerships)
    .leftJoin(users, eq(users.id, rsePartnerships.sopatReferentId))
    .leftJoin(cloudinaryAssets, eq(cloudinaryAssets.id, rsePartnerships.conventionPdfCloudinaryId))
    .where(eq(rsePartnerships.id, id))
    .limit(1)

  if (!row) return null
  return {
    ...row,
    partnerType: row.partnerType as RsePartnerType,
    status: row.status as RsePartnershipStatus,
  }
}

export type CreateRsePartnershipInput = {
  partnerName: string
  partnerType: RsePartnerType
  partnerAddress?: string
  partnerContactName?: string
  partnerContactEmail?: string
  partnerContactPhone?: string
  sopatReferentId: string
  partnerReferentName?: string
  signedDate?: Date
  startDate?: Date
  endDate?: Date
  autoRenewal?: boolean
  noticePeriodDays?: number
  status?: RsePartnershipStatus
  notes?: string
  createdBy: string
}

export async function createRsePartnership(
  input: CreateRsePartnershipInput & { conventionReference: string }
) {
  const [row] = await db
    .insert(rsePartnerships)
    .values({
      ...input,
      autoRenewal: input.autoRenewal ?? false,
      noticePeriodDays: input.noticePeriodDays ?? 30,
      status: input.status ?? 'en_cours_de_negociation',
    })
    .returning()
  return row
}

export type UpdateRsePartnershipInput = Partial<Omit<CreateRsePartnershipInput, 'createdBy'>> & {
  conventionPdfCloudinaryId?: string | null
}

export async function updateRsePartnership(id: string, input: UpdateRsePartnershipInput) {
  const [row] = await db
    .update(rsePartnerships)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(rsePartnerships.id, id))
    .returning()
  return row
}

export async function deleteRsePartnership(id: string) {
  await db.delete(rsePartnerships).where(eq(rsePartnerships.id, id))
}

// ─── Commitment queries ───────────────────────────────────────────────────────

export async function listRseCommitments(partnershipId: string): Promise<RseCommitment[]> {
  const now = new Date()
  const rows = await db
    .select()
    .from(rsePartnershipCommitments)
    .where(eq(rsePartnershipCommitments.partnershipId, partnershipId))
    .orderBy(asc(rsePartnershipCommitments.articleNumber), asc(rsePartnershipCommitments.createdAt))

  // Recompute status based on nextDueDate
  return rows.map((r) => {
    let status = r.status as RseCommitmentStatus
    if (r.nextDueDate) {
      if (r.nextDueDate < now) status = 'en_retard'
      else status = r.status as RseCommitmentStatus
    }
    return { ...r, status } as RseCommitment
  })
}

export type CreateRseCommitmentInput = {
  partnershipId: string
  articleNumber?: string
  commitmentDescription: string
  commitmentType?: RseCommitmentType
  frequency?: RseCommitmentFrequency
  responsibleParty?: RseResponsibleParty
  nextDueDate?: Date
  notes?: string
  createdBy: string
}

export async function createRseCommitment(input: CreateRseCommitmentInput) {
  const [row] = await db
    .insert(rsePartnershipCommitments)
    .values({
      ...input,
      commitmentType: input.commitmentType ?? 'autre',
      frequency: input.frequency ?? 'annuel',
      responsibleParty: input.responsibleParty ?? 'sopat',
      status: 'a_venir',
    })
    .returning()
  return row
}

export async function markCommitmentCompleted(
  id: string,
  actorId: string,
  actorName: string
) {
  const [existing] = await db
    .select()
    .from(rsePartnershipCommitments)
    .where(eq(rsePartnershipCommitments.id, id))
    .limit(1)

  if (!existing) return null

  const now = new Date()
  const nextDue = calcNextDueDate(existing.frequency as RseCommitmentFrequency, now)

  const [updated] = await db
    .update(rsePartnershipCommitments)
    .set({
      lastCompletedDate: now,
      nextDueDate: nextDue,
      status: nextDue ? 'a_venir' : 'respecte',
      updatedAt: now,
    })
    .where(eq(rsePartnershipCommitments.id, id))
    .returning()

  await logRseActivity({
    partnershipId: existing.partnershipId,
    actorId,
    actorName,
    action: 'rse.commitment_completed',
    previousState: {
      lastCompletedDate: existing.lastCompletedDate?.toISOString() ?? null,
      nextDueDate: existing.nextDueDate?.toISOString() ?? null,
      status: existing.status,
    },
    newState: {
      lastCompletedDate: now.toISOString(),
      nextDueDate: nextDue?.toISOString() ?? null,
      status: updated.status,
    },
    metadata: { commitmentId: id, articleNumber: existing.articleNumber },
  })

  return updated
}

// ─── Communication queries ────────────────────────────────────────────────────

export async function listRseCommunications(partnershipId: string): Promise<RseCommunication[]> {
  const rows = await db
    .select({
      id: rsePartnershipCommunications.id,
      partnershipId: rsePartnershipCommunications.partnershipId,
      communicationType: rsePartnershipCommunications.communicationType,
      description: rsePartnershipCommunications.description,
      submittedBy: rsePartnershipCommunications.submittedBy,
      submittedByName: users.name,
      submittedAt: rsePartnershipCommunications.submittedAt,
      validationStatus: rsePartnershipCommunications.validationStatus,
      validatedByName: rsePartnershipCommunications.validatedByName,
      validatedAt: rsePartnershipCommunications.validatedAt,
      assetCloudinaryId: rsePartnershipCommunications.assetCloudinaryId,
      assetUrl: cloudinaryAssets.secureUrl,
      assetPublicId: cloudinaryAssets.publicId,
      requiredByDate: rsePartnershipCommunications.requiredByDate,
      notes: rsePartnershipCommunications.notes,
      createdAt: rsePartnershipCommunications.createdAt,
      updatedAt: rsePartnershipCommunications.updatedAt,
      createdBy: rsePartnershipCommunications.createdBy,
    })
    .from(rsePartnershipCommunications)
    .leftJoin(users, eq(users.id, rsePartnershipCommunications.submittedBy))
    .leftJoin(cloudinaryAssets, eq(cloudinaryAssets.id, rsePartnershipCommunications.assetCloudinaryId))
    .where(eq(rsePartnershipCommunications.partnershipId, partnershipId))
    .orderBy(desc(rsePartnershipCommunications.submittedAt))

  return rows as RseCommunication[]
}

export type CreateRseCommunicationInput = {
  partnershipId: string
  communicationType: RseCommunicationType
  description: string
  submittedBy: string
  requiredByDate?: Date
  notes?: string
  createdBy: string
}

export async function createRseCommunication(input: CreateRseCommunicationInput) {
  const [row] = await db
    .insert(rsePartnershipCommunications)
    .values({
      ...input,
      submittedAt: new Date(),
      validationStatus: 'en_attente',
    })
    .returning()
  return row
}

export async function updateCommunicationValidation(
  id: string,
  validationStatus: 'approuve' | 'refuse',
  validatedByName: string,
  assetCloudinaryId?: string
) {
  const [row] = await db
    .update(rsePartnershipCommunications)
    .set({
      validationStatus,
      validatedByName,
      validatedAt: new Date(),
      assetCloudinaryId: assetCloudinaryId ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(rsePartnershipCommunications.id, id))
    .returning()
  return row
}

// ─── Dashboard helpers ────────────────────────────────────────────────────────

export type RseDashboardData = {
  activeCount: number
  overdueCommitmentsCount: number
  nextExpiring: {
    id: string
    conventionReference: string
    partnerName: string
    endDate: Date
    daysUntil: number
  } | null
}

export async function getRseDashboardData(): Promise<RseDashboardData> {
  const now = new Date()
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const [activeResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsePartnerships)
    .where(eq(rsePartnerships.status, 'actif'))

  const [overdueResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsePartnershipCommitments)
    .where(lt(rsePartnershipCommitments.nextDueDate, now))

  const nextExpiringRows = await db
    .select({
      id: rsePartnerships.id,
      conventionReference: rsePartnerships.conventionReference,
      partnerName: rsePartnerships.partnerName,
      endDate: rsePartnerships.endDate,
    })
    .from(rsePartnerships)
    .where(
      and(
        eq(rsePartnerships.status, 'actif'),
        lte(rsePartnerships.endDate, in90Days),
      )
    )
    .orderBy(asc(rsePartnerships.endDate))
    .limit(1)

  const nextExpiring = nextExpiringRows[0]?.endDate
    ? {
        id: nextExpiringRows[0].id,
        conventionReference: nextExpiringRows[0].conventionReference,
        partnerName: nextExpiringRows[0].partnerName,
        endDate: nextExpiringRows[0].endDate,
        daysUntil: Math.ceil(
          (nextExpiringRows[0].endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    : null

  return {
    activeCount: Number(activeResult?.count ?? 0),
    overdueCommitmentsCount: Number(overdueResult?.count ?? 0),
    nextExpiring,
  }
}

// ─── Expiry sweep (for email reminders) ──────────────────────────────────────

export type ExpiringPartnership = {
  id: string
  conventionReference: string
  partnerName: string
  endDate: Date
  sopatReferentId: string
  sopatReferentEmail: string
  sopatReferentName: string
  daysUntil: number
}

export async function getPartnershipsExpiringWithin(days: number): Promise<ExpiringPartnership[]> {
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id: rsePartnerships.id,
      conventionReference: rsePartnerships.conventionReference,
      partnerName: rsePartnerships.partnerName,
      endDate: rsePartnerships.endDate,
      sopatReferentId: rsePartnerships.sopatReferentId,
      sopatReferentEmail: users.email,
      sopatReferentName: users.name,
    })
    .from(rsePartnerships)
    .innerJoin(users, eq(users.id, rsePartnerships.sopatReferentId))
    .where(
      and(
        eq(rsePartnerships.status, 'actif'),
        lte(rsePartnerships.endDate, cutoff),
      )
    )

  return rows
    .filter((r) => r.endDate != null)
    .map((r) => ({
      ...r,
      endDate: r.endDate!,
      daysUntil: Math.ceil((r.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
}

export type OverdueCommitmentWithReferent = {
  id: string
  partnershipId: string
  conventionReference: string
  partnerName: string
  commitmentDescription: string
  nextDueDate: Date
  sopatReferentId: string
  sopatReferentEmail: string
  sopatReferentName: string
}

export async function getOverdueCommitmentsWithReferents(): Promise<OverdueCommitmentWithReferent[]> {
  const now = new Date()
  const rows = await db
    .select({
      id: rsePartnershipCommitments.id,
      partnershipId: rsePartnershipCommitments.partnershipId,
      conventionReference: rsePartnerships.conventionReference,
      partnerName: rsePartnerships.partnerName,
      commitmentDescription: rsePartnershipCommitments.commitmentDescription,
      nextDueDate: rsePartnershipCommitments.nextDueDate,
      sopatReferentId: rsePartnerships.sopatReferentId,
      sopatReferentEmail: users.email,
      sopatReferentName: users.name,
    })
    .from(rsePartnershipCommitments)
    .innerJoin(rsePartnerships, eq(rsePartnerships.id, rsePartnershipCommitments.partnershipId))
    .innerJoin(users, eq(users.id, rsePartnerships.sopatReferentId))
    .where(
      and(
        lt(rsePartnershipCommitments.nextDueDate, now),
        eq(rsePartnerships.status, 'actif'),
      )
    )

  return rows.filter((r) => r.nextDueDate != null) as OverdueCommitmentWithReferent[]
}
