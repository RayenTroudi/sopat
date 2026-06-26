import { db } from '../../../db/index'
import {
  purchaseOrders,
  cloudinaryAssets,
  plantListItems,
  suppliers,
  users,
  nonConformances,
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
