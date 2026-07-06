import { db } from '../../../db/index'
import {
  purchaseOrders,
  cloudinaryAssets,
  plantListItems,
  suppliers,
  users,
  nonConformances,
  projectTeamMembers,
  chantierDailyLogs,
  realisationActionPlanItems,
} from '../../../db/schema'
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm'
import { attachDmsCode } from '../dms/attach'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseOrderInput = {
  projectId: string
  plantListItemId?: string
  itemDescription: string
  quantityPurchased: string
  unitPricePaid: string
  supplierId?: string
  supplierInvoiceNumber?: string
  invoiceAssetId?: string
  purchaseDate: Date
  purchasedBy: string
  notes?: string
  createdBy: string
}

export type PurchaseOrderRow = {
  id: string
  projectId: string
  plantListItemId: string | null
  plantListItemName: string | null
  itemDescription: string
  quantityPurchased: string
  unitPricePaid: string
  totalCost: string
  supplierId: string | null
  supplierName: string | null
  supplierInvoiceNumber: string | null
  invoiceAssetId: string | null
  invoiceUrl: string | null
  purchaseDate: Date
  purchasedBy: string
  purchasedByName: string | null
  status: string
  notes: string | null
  createdAt: Date
}

export type SitePhotoCheckpoint = {
  id: string
  label: string
  milestone: string
  photo: {
    id: string
    secureUrl: string
    uploadedAt: Date
  } | null
}

export type RealisationSignoffChecks = {
  hasAll5Photos: boolean
  hasClientReception: boolean
  hasBudgetReconciliation: boolean
  hasNoOpenNCs: boolean
  allPassed: boolean
  details: {
    completedMilestones: string[]
    missingMilestones: string[]
  }
}

export type BudgetReconciliation = {
  id: string
  approvedBudget: string
  totalSpent: string
  variance: string
  variancePct: string
  notes: string
  submittedAt: Date
  submittedByName: string | null
}

// The 5 required milestone photo tags — stored in `linkedEntity` column of cloudinary_assets
// Format: "site_photo_milestone:<key>"
export const SITE_PHOTO_MILESTONES = [
  { key: 'mobilisation',     label: 'Mobilisation du chantier' },
  { key: 'progress_25',      label: 'Avancement 25%' },
  { key: 'progress_50',      label: 'Avancement 50%' },
  { key: 'progress_75',      label: 'Avancement 75%' },
  { key: 'reception_finale', label: 'Réception finale' },
] as const

export type MilestoneKey = typeof SITE_PHOTO_MILESTONES[number]['key']

function milestoneLinkedEntity(key: string) {
  return `site_photo_milestone:${key}`
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function getPurchaseOrders(projectId: string): Promise<PurchaseOrderRow[]> {
  const rows = await db
    .select({
      id: purchaseOrders.id,
      projectId: purchaseOrders.projectId,
      plantListItemId: purchaseOrders.plantListItemId,
      plantListItemName: plantListItems.botanicalName,
      itemDescription: purchaseOrders.itemDescription,
      quantityPurchased: purchaseOrders.quantityPurchased,
      unitPricePaid: purchaseOrders.unitPricePaid,
      totalCost: purchaseOrders.totalCost,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      supplierInvoiceNumber: purchaseOrders.supplierInvoiceNumber,
      invoiceAssetId: purchaseOrders.invoiceAssetId,
      invoiceUrl: cloudinaryAssets.secureUrl,
      purchaseDate: purchaseOrders.purchaseDate,
      purchasedBy: purchaseOrders.purchasedBy,
      purchasedByName: users.name,
      status: purchaseOrders.status,
      notes: purchaseOrders.notes,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(plantListItems, eq(purchaseOrders.plantListItemId, plantListItems.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(users, eq(purchaseOrders.purchasedBy, users.id))
    .leftJoin(cloudinaryAssets, eq(purchaseOrders.invoiceAssetId, cloudinaryAssets.id))
    .where(eq(purchaseOrders.projectId, projectId))
    .orderBy(desc(purchaseOrders.purchaseDate))

  return rows as PurchaseOrderRow[]
}

export async function createPurchaseOrder(input: PurchaseOrderInput) {
  const qty   = parseFloat(input.quantityPurchased)
  const price = parseFloat(input.unitPricePaid)
  const total = (qty * price).toFixed(3)

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        projectId:             input.projectId,
        plantListItemId:       input.plantListItemId || null,
        itemDescription:       input.itemDescription,
        quantityPurchased:     input.quantityPurchased,
        unitPricePaid:         input.unitPricePaid,
        totalCost:             total,
        supplierId:            input.supplierId || null,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
        invoiceAssetId:        input.invoiceAssetId || null,
        purchaseDate:          input.purchaseDate,
        purchasedBy:           input.purchasedBy,
        status:                'received',
        notes:                 input.notes,
        createdBy:             input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'AC',
      designation: input.itemDescription,
      department:  'finance',
      category:    'bon_commande',
      entityType:  'purchase_order',
      entityId:    order.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(purchaseOrders)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(purchaseOrders.id, order.id))

    return { ...order, dmsDocumentCode: dmsCode }
  })
}

export async function updatePurchaseOrder(
  orderId: string,
  projectId: string,
  input: {
    itemDescription?:       string
    quantityPurchased?:     string
    unitPricePaid?:         string
    supplierId?:            string | null
    supplierInvoiceNumber?: string | null
    purchaseDate?:          Date
    notes?:                 string | null
    status?:                'pending' | 'ordered' | 'received' | 'invoiced'
  }
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (input.itemDescription       !== undefined) updates.itemDescription       = input.itemDescription
  if (input.quantityPurchased     !== undefined) updates.quantityPurchased     = input.quantityPurchased
  if (input.unitPricePaid         !== undefined) updates.unitPricePaid         = input.unitPricePaid
  if (input.supplierId            !== undefined) updates.supplierId            = input.supplierId
  if (input.supplierInvoiceNumber !== undefined) updates.supplierInvoiceNumber = input.supplierInvoiceNumber
  if (input.purchaseDate          !== undefined) updates.purchaseDate          = input.purchaseDate
  if (input.notes                 !== undefined) updates.notes                 = input.notes
  if (input.status                !== undefined) updates.status                = input.status

  // Recalculate total if qty or price changed
  if (input.quantityPurchased !== undefined || input.unitPricePaid !== undefined) {
    const existing = await db
      .select({ qty: purchaseOrders.quantityPurchased, price: purchaseOrders.unitPricePaid })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.projectId, projectId)))
      .limit(1)
    if (existing[0]) {
      const qty   = parseFloat(input.quantityPurchased ?? existing[0].qty)
      const price = parseFloat(input.unitPricePaid     ?? existing[0].price)
      updates.totalCost = (qty * price).toFixed(3)
    }
  }

  const [row] = await db
    .update(purchaseOrders)
    .set(updates)
    .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.projectId, projectId)))
    .returning()
  return row ?? null
}

export async function deletePurchaseOrder(orderId: string, projectId: string) {
  await db
    .delete(purchaseOrders)
    .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.projectId, projectId)))
}

export async function getPurchaseOrderById(orderId: string) {
  const [row] = await db
    .select({ id: purchaseOrders.id, projectId: purchaseOrders.projectId })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, orderId))
    .limit(1)
  return row ?? null
}

// ─── Budget: total spent ──────────────────────────────────────────────────────

export async function getTotalSpent(projectId: string): Promise<string> {
  const [result] = await db
    .select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, projectId))
  return result?.total ?? '0'
}

// ─── Site photo checkpoints ───────────────────────────────────────────────────

export async function getSitePhotoCheckpoints(projectId: string): Promise<SitePhotoCheckpoint[]> {
  // Milestone key is stored in linkedEntity as "site_photo_milestone:<key>"
  const photos = await db
    .select({
      id: cloudinaryAssets.id,
      secureUrl: cloudinaryAssets.secureUrl,
      linkedEntity: cloudinaryAssets.linkedEntity,
      createdAt: cloudinaryAssets.createdAt,
    })
    .from(cloudinaryAssets)
    .where(
      and(
        eq(cloudinaryAssets.projectId, projectId),
        eq(cloudinaryAssets.assetType, 'site_photo')
      )
    )
    .orderBy(asc(cloudinaryAssets.createdAt))

  return SITE_PHOTO_MILESTONES.map((m) => {
    const tag = milestoneLinkedEntity(m.key)
    const match = photos.find((p) => p.linkedEntity === tag)
    return {
      id: m.key,
      label: m.label,
      milestone: m.key,
      photo: match
        ? { id: match.id, secureUrl: match.secureUrl, uploadedAt: match.createdAt }
        : null,
    }
  })
}

// Called after a site photo is uploaded — records which milestone it covers
// The upload API sets linkedEntity = "site_photo_milestone:<key>"
// This helper exists for explicit recording from the realisation tab
export function buildMilestoneLinkedEntity(key: string) {
  return milestoneLinkedEntity(key)
}

// ─── Budget reconciliation ────────────────────────────────────────────────────

// Stored as a special cloudinary_assets row with:
//   assetType = 'other'
//   linkedEntity = 'budget_reconciliation'
//   linkedEntityId = projectId (parsed as non-UUID, stored as varchar)
//   publicId encodes the JSON payload (base64)

function reconciliationPublicId(projectId: string) {
  return `budget_recon_${projectId}`
}

export async function getBudgetReconciliation(projectId: string): Promise<BudgetReconciliation | null> {
  const [row] = await db
    .select({
      id: cloudinaryAssets.id,
      publicId: cloudinaryAssets.publicId,
      createdAt: cloudinaryAssets.createdAt,
      userName: users.name,
    })
    .from(cloudinaryAssets)
    .leftJoin(users, eq(cloudinaryAssets.uploadedBy, users.id))
    .where(
      and(
        eq(cloudinaryAssets.projectId, projectId),
        eq(cloudinaryAssets.linkedEntity, 'budget_reconciliation')
      )
    )
    .orderBy(desc(cloudinaryAssets.createdAt))
    .limit(1)

  if (!row) return null

  try {
    // publicId stores base64-encoded JSON payload
    const json = Buffer.from(
      row.publicId.replace(`budget_recon_${projectId}_`, ''),
      'base64'
    ).toString('utf-8')
    const data = JSON.parse(json) as {
      approvedBudget: string
      totalSpent: string
      variance: string
      variancePct: string
      notes: string
    }
    return {
      id: row.id,
      ...data,
      submittedAt: row.createdAt,
      submittedByName: row.userName,
    }
  } catch {
    return null
  }
}

export async function saveBudgetReconciliation(data: {
  projectId: string
  approvedBudget: string
  totalSpent: string
  notes: string
  userId: string
}) {
  const approved = parseFloat(data.approvedBudget)
  const spent = parseFloat(data.totalSpent)
  const variance = (spent - approved).toFixed(3)
  const variancePct = approved > 0 ? (((spent - approved) / approved) * 100).toFixed(1) : '0'

  const payload = {
    approvedBudget: data.approvedBudget,
    totalSpent: data.totalSpent,
    variance,
    variancePct,
    notes: data.notes,
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
  const publicId = `budget_recon_${data.projectId}_${encoded}`

  // Upsert: delete previous then insert new
  await db
    .delete(cloudinaryAssets)
    .where(
      and(
        eq(cloudinaryAssets.projectId, data.projectId),
        eq(cloudinaryAssets.linkedEntity, 'budget_reconciliation')
      )
    )

  const [row] = await db
    .insert(cloudinaryAssets)
    .values({
      publicId,
      url: '',
      secureUrl: '',
      assetType: 'other',
      linkedEntity: 'budget_reconciliation',
      projectId: data.projectId,
      uploadedBy: data.userId,
      createdBy: data.userId,
    })
    .returning()

  return row
}

// ─── FOR-RE-03: Project Team Members ─────────────────────────────────────────

export type TeamMemberRow = {
  id: string
  poste: string
  titulaire: string | null
  suppleant: string | null
  isSubcontractor: boolean
  subcontractorName: string | null
  userId: string | null
  phaseStartDate: string | null
  phaseEndDate: string | null
  sortOrder: number
}

export type TeamMemberInput = {
  poste: string
  titulaire?: string
  suppleant?: string
  isSubcontractor?: boolean
  subcontractorName?: string
  userId?: string
  phaseStartDate?: string
  phaseEndDate?: string
  sortOrder?: number
}

export async function getProjectTeamMembers(projectId: string): Promise<TeamMemberRow[]> {
  return db
    .select({
      id: projectTeamMembers.id,
      poste: projectTeamMembers.poste,
      titulaire: projectTeamMembers.titulaire,
      suppleant: projectTeamMembers.suppleant,
      isSubcontractor: projectTeamMembers.isSubcontractor,
      subcontractorName: projectTeamMembers.subcontractorName,
      userId: projectTeamMembers.userId,
      phaseStartDate: projectTeamMembers.phaseStartDate,
      phaseEndDate: projectTeamMembers.phaseEndDate,
      sortOrder: projectTeamMembers.sortOrder,
    })
    .from(projectTeamMembers)
    .where(eq(projectTeamMembers.projectId, projectId))
    .orderBy(asc(projectTeamMembers.sortOrder), asc(projectTeamMembers.createdAt))
}

export async function upsertProjectTeamMembers(
  projectId: string,
  members: TeamMemberInput[],
  userId: string
) {
  await db.delete(projectTeamMembers).where(eq(projectTeamMembers.projectId, projectId))
  if (members.length === 0) return []
  return db
    .insert(projectTeamMembers)
    .values(
      members.map((m, i) => ({
        projectId,
        poste: m.poste,
        titulaire: m.titulaire ?? null,
        suppleant: m.suppleant ?? null,
        isSubcontractor: m.isSubcontractor ?? false,
        subcontractorName: m.subcontractorName ?? null,
        userId: m.userId ?? null,
        phaseStartDate: m.phaseStartDate ?? null,
        phaseEndDate: m.phaseEndDate ?? null,
        sortOrder: m.sortOrder ?? i,
        createdBy: userId,
      }))
    )
    .returning()
}

// ─── FOR-RE-04: Chantier Daily Logs ──────────────────────────────────────────

export type DailyLogRow = {
  id: string
  logDate: string
  dayNumber: number | null
  totalProgress: string | null
  worksDoneToday: string | null
  supplies: string | null
  anomalies: string | null
  participants: { name: string; role: string }[]
  otherIntervenants: string | null
  remarks: string | null
  nextDayAgenda: string | null
  chefProjet: string | null
  createdByName: string | null
  createdAt: Date
}

export type DailyLogInput = {
  logDate: string
  dayNumber?: number
  totalProgress?: number
  worksDoneToday?: string
  supplies?: string
  anomalies?: string
  participants?: { name: string; role: string }[]
  otherIntervenants?: string
  remarks?: string
  nextDayAgenda?: string
  chefProjet?: string
}

export async function getChantierDailyLogs(projectId: string): Promise<DailyLogRow[]> {
  const rows = await db
    .select({
      id: chantierDailyLogs.id,
      logDate: chantierDailyLogs.logDate,
      dayNumber: chantierDailyLogs.dayNumber,
      totalProgress: chantierDailyLogs.totalProgress,
      worksDoneToday: chantierDailyLogs.worksDoneToday,
      supplies: chantierDailyLogs.supplies,
      anomalies: chantierDailyLogs.anomalies,
      participants: chantierDailyLogs.participants,
      otherIntervenants: chantierDailyLogs.otherIntervenants,
      remarks: chantierDailyLogs.remarks,
      nextDayAgenda: chantierDailyLogs.nextDayAgenda,
      chefProjet: chantierDailyLogs.chefProjet,
      createdByName: users.name,
      createdAt: chantierDailyLogs.createdAt,
    })
    .from(chantierDailyLogs)
    .leftJoin(users, eq(chantierDailyLogs.createdBy, users.id))
    .where(eq(chantierDailyLogs.projectId, projectId))
    .orderBy(desc(chantierDailyLogs.logDate))
  return rows as DailyLogRow[]
}

export async function createDailyLog(projectId: string, input: DailyLogInput, userId: string) {
  const [row] = await db
    .insert(chantierDailyLogs)
    .values({
      projectId,
      logDate: input.logDate,
      dayNumber: input.dayNumber ?? null,
      totalProgress: input.totalProgress != null ? String(input.totalProgress) : null,
      worksDoneToday: input.worksDoneToday ?? null,
      supplies: input.supplies ?? null,
      anomalies: input.anomalies ?? null,
      participants: (input.participants ?? []) as never,
      otherIntervenants: input.otherIntervenants ?? null,
      remarks: input.remarks ?? null,
      nextDayAgenda: input.nextDayAgenda ?? null,
      chefProjet: input.chefProjet ?? null,
      createdBy: userId,
    })
    .returning()
  return row
}

export async function updateDailyLog(
  logId: string,
  projectId: string,
  input: Partial<DailyLogInput>,
  _userId: string
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (input.logDate           !== undefined) updates.logDate           = input.logDate
  if (input.dayNumber         !== undefined) updates.dayNumber         = input.dayNumber
  if (input.totalProgress     !== undefined) updates.totalProgress     = String(input.totalProgress)
  if (input.worksDoneToday    !== undefined) updates.worksDoneToday    = input.worksDoneToday
  if (input.supplies          !== undefined) updates.supplies          = input.supplies
  if (input.anomalies         !== undefined) updates.anomalies         = input.anomalies
  if (input.participants      !== undefined) updates.participants      = input.participants as never
  if (input.otherIntervenants !== undefined) updates.otherIntervenants = input.otherIntervenants
  if (input.remarks           !== undefined) updates.remarks           = input.remarks
  if (input.nextDayAgenda     !== undefined) updates.nextDayAgenda     = input.nextDayAgenda
  if (input.chefProjet        !== undefined) updates.chefProjet        = input.chefProjet
  const [row] = await db
    .update(chantierDailyLogs)
    .set(updates)
    .where(and(eq(chantierDailyLogs.id, logId), eq(chantierDailyLogs.projectId, projectId)))
    .returning()
  return row ?? null
}

export async function deleteDailyLog(logId: string, projectId: string) {
  await db
    .delete(chantierDailyLogs)
    .where(and(eq(chantierDailyLogs.id, logId), eq(chantierDailyLogs.projectId, projectId)))
}

// ─── PLA-RE-03: Réalisation Action Plan ──────────────────────────────────────

export type ActionPlanItemRow = {
  id: string
  phaseCode: string
  phaseLabel: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  progressPct: number
  observations: string | null
  sortOrder: number
  isPhaseHeader: boolean
}

export type ActionPlanItemInput = {
  phaseCode: string
  phaseLabel: string
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  progressPct?: number
  observations?: string
  sortOrder?: number
  isPhaseHeader?: boolean
}

export async function getActionPlanItems(projectId: string): Promise<ActionPlanItemRow[]> {
  return db
    .select({
      id: realisationActionPlanItems.id,
      phaseCode: realisationActionPlanItems.phaseCode,
      phaseLabel: realisationActionPlanItems.phaseLabel,
      plannedStartDate: realisationActionPlanItems.plannedStartDate,
      plannedEndDate: realisationActionPlanItems.plannedEndDate,
      actualStartDate: realisationActionPlanItems.actualStartDate,
      actualEndDate: realisationActionPlanItems.actualEndDate,
      progressPct: realisationActionPlanItems.progressPct,
      observations: realisationActionPlanItems.observations,
      sortOrder: realisationActionPlanItems.sortOrder,
      isPhaseHeader: realisationActionPlanItems.isPhaseHeader,
    })
    .from(realisationActionPlanItems)
    .where(eq(realisationActionPlanItems.projectId, projectId))
    .orderBy(asc(realisationActionPlanItems.sortOrder))
}

export async function upsertActionPlanItems(
  projectId: string,
  items: ActionPlanItemInput[],
  userId: string
) {
  await db
    .delete(realisationActionPlanItems)
    .where(eq(realisationActionPlanItems.projectId, projectId))
  if (items.length === 0) return []
  return db
    .insert(realisationActionPlanItems)
    .values(
      items.map((item, i) => ({
        projectId,
        phaseCode: item.phaseCode,
        phaseLabel: item.phaseLabel,
        plannedStartDate: item.plannedStartDate ?? null,
        plannedEndDate: item.plannedEndDate ?? null,
        actualStartDate: item.actualStartDate ?? null,
        actualEndDate: item.actualEndDate ?? null,
        progressPct: item.progressPct ?? 0,
        observations: item.observations ?? null,
        sortOrder: item.sortOrder ?? i,
        isPhaseHeader: item.isPhaseHeader ?? false,
        createdBy: userId,
      }))
    )
    .returning()
}

export async function updateActionPlanItem(
  itemId: string,
  projectId: string,
  input: Partial<ActionPlanItemInput>
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (input.plannedStartDate !== undefined) updates.plannedStartDate = input.plannedStartDate
  if (input.plannedEndDate   !== undefined) updates.plannedEndDate   = input.plannedEndDate
  if (input.actualStartDate  !== undefined) updates.actualStartDate  = input.actualStartDate
  if (input.actualEndDate    !== undefined) updates.actualEndDate    = input.actualEndDate
  if (input.progressPct      !== undefined) updates.progressPct      = input.progressPct
  if (input.observations     !== undefined) updates.observations     = input.observations
  const [row] = await db
    .update(realisationActionPlanItems)
    .set(updates)
    .where(and(eq(realisationActionPlanItems.id, itemId), eq(realisationActionPlanItems.projectId, projectId)))
    .returning()
  return row ?? null
}

// ─── Réalisation sign-off prerequisite check ──────────────────────────────────

export async function checkRealisationSignoffPrerequisites(
  projectId: string
): Promise<RealisationSignoffChecks> {
  const [checkpoints, reconciliation, openNCs, receptionAssets] = await Promise.all([
    getSitePhotoCheckpoints(projectId),
    getBudgetReconciliation(projectId),
    db
      .select({ id: nonConformances.id })
      .from(nonConformances)
      .where(
        and(
          eq(nonConformances.projectId, projectId),
          isNull(nonConformances.deletedAt),
          sql`${nonConformances.status} IN ('open', 'in_progress')`
        )
      )
      .limit(1),
    db
      .select({ id: cloudinaryAssets.id })
      .from(cloudinaryAssets)
      .where(
        and(
          eq(cloudinaryAssets.projectId, projectId),
          eq(cloudinaryAssets.assetType, 'reception_document')
        )
      )
      .limit(1),
  ])

  const completedMilestones = checkpoints.filter((c) => c.photo !== null).map((c) => c.milestone)
  const missingMilestones = checkpoints.filter((c) => c.photo === null).map((c) => c.milestone)
  const hasAll5Photos = missingMilestones.length === 0
  const hasClientReception = receptionAssets.length > 0
  const hasBudgetReconciliation = reconciliation !== null
  const hasNoOpenNCs = openNCs.length === 0

  return {
    hasAll5Photos,
    hasClientReception,
    hasBudgetReconciliation,
    hasNoOpenNCs,
    allPassed: hasAll5Photos && hasClientReception && hasBudgetReconciliation && hasNoOpenNCs,
    details: { completedMilestones, missingMilestones },
  }
}
