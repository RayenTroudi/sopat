/**
 * FOR-AC-10 — « Suivi d'approvisionnement de chantier ».
 *
 * One register per project. It holds the planned lines of the validated devis;
 * each line carries its own arrivals on site (Suivi réel) and its own purchase
 * records (Suivi d'achat), both of which are lists, because the workbook shows
 * a single planned line spanning six delivery rows and six purchase rows.
 *
 * No derived figure is stored. `getSupplyRegister` reads the raw columns and
 * runs them through `@/lib/supply-calc`, so a corrected delivery immediately
 * corrects every variance and indicator above it.
 *
 * The header block of the sheet is served from `projects`: reference, name,
 * client, start date, and the end date whose "En cours" is precisely
 * `actualDeliveryDate IS NULL`.
 */
import { db } from '@/db'
import {
  projects,
  purchaseOrders,
  suppliers,
  supplyDeliveries,
  supplyItems,
  supplyPurchases,
  supplyRegisters,
  users,
} from '@/db/schema'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import {
  computeItem,
  computeRegister,
  num,
  numOrNull,
  type SupplyItemTotals,
  type SupplyRegisterTotals,
} from '@/lib/supply-calc'

export const SUPPLY_FORM_CODE = 'FOR-AC-10'

/**
 * Who may change what a chantier cost. Same list as the décompte and the achat
 * screens: procurement figures are an études/réalisation responsibility, not
 * something a field account can rewrite. Exported so the route enforces it, the
 * UI mirrors it and the tests assert the real constant rather than a copy.
 */
export const SUPPLY_WRITE_ROLES = ['admin', 'direction', 'realisation_chef', 'etudes_chef'] as const

export function canEditSupplyRegister(role: string): boolean {
  return (SUPPLY_WRITE_ROLES as readonly string[]).includes(role)
}

// ─── Read shapes ─────────────────────────────────────────────────────────────

export type SupplyDeliveryRow = {
  id: string
  position: number
  deliveryDate: string | null
  supplierId: string | null
  supplierLabel: string | null
  /** Resolved name: the linked supplier's, else the free-text label. */
  supplierName: string | null
  blNumber: string | null
  deliveryNoteId: string | null
  quantity: number
}

export type SupplyPurchaseRow = {
  id: string
  position: number
  supplierId: string | null
  supplierLabel: string | null
  supplierName: string | null
  norme: string | null
  quantity: number
  unitPriceHtva: number
  /** Fraction, not percent: 0.19 is 19 %. */
  vatRate: number
  /** The bon de commande already accounting for this line, if any. */
  purchaseOrderId: string | null
  purchaseOrderReference: string | null
  totalHtva: number
  vatAmount: number
  totalTtc: number
}

export type SupplyItemRow = {
  id: string
  position: number
  designation: string
  norme: string | null
  plannedQuantity: number
  plannedUnitPriceHtva: number
  /** null = unchanged from the devis, which is the sheet's `=D10`. */
  actualUnitPriceHtva: number | null
  observations: string | null
  deliveries: SupplyDeliveryRow[]
  purchases: SupplyPurchaseRow[]
  totals: SupplyItemTotals
}

export type SupplyRegisterRow = {
  id: string
  projectId: string
  observations: string | null
  dmsDocumentCode: string | null
  createdAt: Date
  updatedAt: Date
  project: {
    reference: string
    name: string
    clientName: string
    currency: string
    startDate: Date | null
    /** null renders as « En cours », exactly like the workbook's D6. */
    endDate: Date | null
  }
  items: SupplyItemRow[]
  totals: SupplyRegisterTotals
}

// ─── Read ────────────────────────────────────────────────────────────────────

/** The live register of a project, with every figure recomputed. */
export async function getSupplyRegister(projectId: string): Promise<SupplyRegisterRow | null> {
  const [row] = await db
    .select({ register: supplyRegisters, project: projects })
    .from(supplyRegisters)
    .innerJoin(projects, eq(supplyRegisters.projectId, projects.id))
    .where(and(eq(supplyRegisters.projectId, projectId), isNull(supplyRegisters.deletedAt)))
    .limit(1)

  if (!row) return null

  const items = await db
    .select()
    .from(supplyItems)
    .where(eq(supplyItems.registerId, row.register.id))
    .orderBy(asc(supplyItems.position))

  const itemIds = items.map((i) => i.id)

  // Suppliers are joined so the UI shows a name without a second round trip;
  // a delivery may name a supplier that is not in FOR-AC-11 yet, hence the
  // free-text fallback rather than a forced foreign key.
  const [deliveries, purchases] = itemIds.length
    ? await Promise.all([
        db
          .select({ d: supplyDeliveries, supplierName: suppliers.name })
          .from(supplyDeliveries)
          .leftJoin(suppliers, eq(supplyDeliveries.supplierId, suppliers.id))
          .where(inArray(supplyDeliveries.itemId, itemIds))
          .orderBy(asc(supplyDeliveries.position)),
        db
          .select({
            p: supplyPurchases,
            supplierName: suppliers.name,
            poDescription: purchaseOrders.itemDescription,
          })
          .from(supplyPurchases)
          .leftJoin(suppliers, eq(supplyPurchases.supplierId, suppliers.id))
          .leftJoin(purchaseOrders, eq(supplyPurchases.purchaseOrderId, purchaseOrders.id))
          .where(inArray(supplyPurchases.itemId, itemIds))
          .orderBy(asc(supplyPurchases.position)),
      ])
    : [[], []]

  const itemRows: SupplyItemRow[] = items.map((item) => {
    const ds: SupplyDeliveryRow[] = deliveries
      .filter((r) => r.d.itemId === item.id)
      .map(({ d, supplierName }) => ({
        id: d.id,
        position: d.position,
        deliveryDate: d.deliveryDate,
        supplierId: d.supplierId,
        supplierLabel: d.supplierLabel,
        supplierName: supplierName ?? d.supplierLabel,
        blNumber: d.blNumber,
        deliveryNoteId: d.deliveryNoteId,
        quantity: num(d.quantity),
      }))

    const ps: SupplyPurchaseRow[] = purchases
      .filter((r) => r.p.itemId === item.id)
      .map(({ p, supplierName, poDescription }) => {
        const quantity = num(p.quantity)
        const unitPriceHtva = num(p.unitPriceHtva)
        const vatRate = num(p.vatRate)
        const totalHtva = quantity * unitPriceHtva
        const vatAmount = totalHtva * vatRate
        return {
          id: p.id,
          position: p.position,
          supplierId: p.supplierId,
          supplierLabel: p.supplierLabel,
          supplierName: supplierName ?? p.supplierLabel,
          norme: p.norme,
          quantity,
          unitPriceHtva,
          vatRate,
          purchaseOrderId: p.purchaseOrderId,
          purchaseOrderReference: poDescription ?? null,
          totalHtva,
          vatAmount,
          totalTtc: totalHtva + vatAmount,
        }
      })

    const plannedQuantity = num(item.plannedQuantity)
    const plannedUnitPriceHtva = num(item.plannedUnitPriceHtva)
    const actualUnitPriceHtva = numOrNull(item.actualUnitPriceHtva)

    return {
      id: item.id,
      position: item.position,
      designation: item.designation,
      norme: item.norme,
      plannedQuantity,
      plannedUnitPriceHtva,
      actualUnitPriceHtva,
      observations: item.observations,
      deliveries: ds,
      purchases: ps,
      totals: computeItem({
        plannedQuantity,
        plannedUnitPriceHtva,
        actualUnitPriceHtva,
        deliveries: ds.map((d) => ({ quantity: d.quantity })),
        purchases: ps.map((p) => ({
          quantity: p.quantity, unitPriceHtva: p.unitPriceHtva, vatRate: p.vatRate,
        })),
      }),
    }
  })

  return {
    id: row.register.id,
    projectId: row.register.projectId,
    observations: row.register.observations,
    dmsDocumentCode: row.register.dmsDocumentCode,
    createdAt: row.register.createdAt,
    updatedAt: row.register.updatedAt,
    project: {
      reference: row.project.reference,
      name: row.project.name,
      clientName: row.project.clientName,
      currency: row.project.currency,
      startDate: row.project.startDate,
      endDate: row.project.actualDeliveryDate,
    },
    items: itemRows,
    totals: computeRegister(itemRows.map((i) => i.totals)),
  }
}

/** Registers across all projects, for the achat-level index. */
export async function getSupplyRegisterSummaries() {
  const rows = await db
    .select({ register: supplyRegisters, project: projects })
    .from(supplyRegisters)
    .innerJoin(projects, eq(supplyRegisters.projectId, projects.id))
    .where(and(isNull(supplyRegisters.deletedAt), isNull(projects.deletedAt)))
    .orderBy(asc(projects.name))

  // Small N (one register per project) — a per-register read keeps the totals
  // in one place rather than duplicating the formulas in a bespoke SQL rollup.
  return Promise.all(
    rows.map(async ({ register, project }) => {
      const full = await getSupplyRegister(register.projectId)
      return {
        id: register.id,
        projectId: register.projectId,
        projectName: project.name,
        projectReference: project.reference,
        clientName: project.clientName,
        currency: project.currency,
        totals: full?.totals ?? null,
      }
    })
  )
}

// ─── Write ───────────────────────────────────────────────────────────────────

/** Returns the project's register, creating it on first use. Idempotent. */
export async function ensureSupplyRegister(
  projectId: string,
  userId: string,
  actor: AuditActor
): Promise<string> {
  const [existing] = await db
    .select({ id: supplyRegisters.id })
    .from(supplyRegisters)
    .where(and(eq(supplyRegisters.projectId, projectId), isNull(supplyRegisters.deletedAt)))
    .limit(1)
  if (existing) return existing.id

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(supplyRegisters)
      .values({ projectId, createdBy: userId })
      .returning({ id: supplyRegisters.id })
    await recordAudit(tx, {
      entityType: 'supply_register',
      entityId: created.id,
      action: 'created',
      actor,
      newState: { projectId },
    })
    return created.id
  })
}

export type SupplyDeliveryInputRow = {
  id?: string
  deliveryDate?: string | null
  supplierId?: string | null
  supplierLabel?: string | null
  blNumber?: string | null
  deliveryNoteId?: string | null
  quantity: number
}

export type SupplyPurchaseInputRow = {
  id?: string
  supplierId?: string | null
  supplierLabel?: string | null
  norme?: string | null
  quantity: number
  unitPriceHtva: number
  /** Fraction, not percent. Omitted means 0, which makes TTC equal HTVA. */
  vatRate?: number
  /** Set when a bon de commande already accounts for this purchase. */
  purchaseOrderId?: string | null
}

export type SupplyItemInputRow = {
  id?: string
  designation: string
  norme?: string | null
  plannedQuantity: number
  plannedUnitPriceHtva: number
  actualUnitPriceHtva?: number | null
  observations?: string | null
  deliveries: SupplyDeliveryInputRow[]
  purchases: SupplyPurchaseInputRow[]
}

/**
 * Replaces the register's lines with `items`, in one transaction.
 *
 * Delete-and-reinsert of the children, like `upsertLineItems` for the décompte:
 * the register is edited as a whole grid, and a partial diff would leave the
 * positions of untouched rows ambiguous. Rows carry no external references, so
 * nothing downstream is orphaned — unlike an audit finding's NC link, which is
 * why that one is carried forward by id instead.
 *
 * Every field written is named explicitly. The input type is the allowlist:
 * a payload key that is not read here cannot reach a column.
 */
export async function replaceSupplyItems(
  registerId: string,
  items: SupplyItemInputRow[],
  userId: string,
  actor: AuditActor
) {
  return db.transaction(async (tx) => {
    const previous = await tx
      .select({ id: supplyItems.id })
      .from(supplyItems)
      .where(eq(supplyItems.registerId, registerId))
    const previousIds = previous.map((p) => p.id)

    if (previousIds.length) {
      await tx.delete(supplyDeliveries).where(inArray(supplyDeliveries.itemId, previousIds))
      await tx.delete(supplyPurchases).where(inArray(supplyPurchases.itemId, previousIds))
      await tx.delete(supplyItems).where(eq(supplyItems.registerId, registerId))
    }

    for (const [index, item] of items.entries()) {
      const [row] = await tx
        .insert(supplyItems)
        .values({
          registerId,
          position: index,
          designation: item.designation,
          norme: item.norme ?? null,
          plannedQuantity: String(item.plannedQuantity),
          plannedUnitPriceHtva: String(item.plannedUnitPriceHtva),
          actualUnitPriceHtva:
            item.actualUnitPriceHtva === null || item.actualUnitPriceHtva === undefined
              ? null
              : String(item.actualUnitPriceHtva),
          observations: item.observations ?? null,
          createdBy: userId,
        })
        .returning({ id: supplyItems.id })

      if (item.deliveries.length) {
        await tx.insert(supplyDeliveries).values(
          item.deliveries.map((d, i) => ({
            itemId: row.id,
            position: i,
            deliveryDate: d.deliveryDate ?? null,
            supplierId: d.supplierId ?? null,
            supplierLabel: d.supplierLabel ?? null,
            blNumber: d.blNumber ?? null,
            deliveryNoteId: d.deliveryNoteId ?? null,
            quantity: String(d.quantity),
            createdBy: userId,
          }))
        )
      }

      if (item.purchases.length) {
        await tx.insert(supplyPurchases).values(
          item.purchases.map((p, i) => ({
            itemId: row.id,
            position: i,
            supplierId: p.supplierId ?? null,
            supplierLabel: p.supplierLabel ?? null,
            norme: p.norme ?? null,
            quantity: String(p.quantity),
            unitPriceHtva: String(p.unitPriceHtva),
            vatRate: String(p.vatRate ?? 0),
            purchaseOrderId: p.purchaseOrderId ?? null,
            createdBy: userId,
          }))
        )
      }
    }

    await tx
      .update(supplyRegisters)
      .set({ updatedAt: new Date() })
      .where(eq(supplyRegisters.id, registerId))

    await recordAudit(tx, {
      entityType: 'supply_register',
      entityId: registerId,
      action: 'updated',
      actor,
      previousState: { itemCount: previousIds.length },
      newState: {
        itemCount: items.length,
        deliveryCount: items.reduce((s, i) => s + i.deliveries.length, 0),
        purchaseCount: items.reduce((s, i) => s + i.purchases.length, 0),
      },
    })

    return { itemCount: items.length }
  })
}

/** Updates the register-level observation. Explicit single-field allowlist. */
export async function updateSupplyRegisterObservations(
  registerId: string,
  observations: string | null,
  actor: AuditActor
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({ observations: supplyRegisters.observations })
      .from(supplyRegisters)
      .where(eq(supplyRegisters.id, registerId))
      .limit(1)
    if (!before) return null

    const [row] = await tx
      .update(supplyRegisters)
      .set({ observations, updatedAt: new Date() })
      .where(eq(supplyRegisters.id, registerId))
      .returning()

    await recordAudit(tx, {
      entityType: 'supply_register',
      entityId: registerId,
      action: 'updated',
      actor,
      previousState: { observations: before.observations },
      newState: { observations },
    })
    return row
  })
}

/** Suppliers for the register's pickers — reuses the FOR-AC-11 register. */
export async function getSupplySuppliers() {
  return db
    .select({ id: suppliers.id, name: suppliers.name, category: suppliers.category })
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(asc(suppliers.name))
}

/** Creator name, for the register footer. */
export async function getSupplyRegisterAuthor(registerId: string) {
  const [row] = await db
    .select({ name: users.name })
    .from(supplyRegisters)
    .leftJoin(users, eq(supplyRegisters.createdBy, users.id))
    .where(eq(supplyRegisters.id, registerId))
    .limit(1)
  return row?.name ?? null
}

// ─── Budget consumption ──────────────────────────────────────────────────────
//
// FOR-AC-10's contribution to a project's budget is NOT computed here. It is
// one term of the canonical rule, which lives in `./project-spend.ts` together
// with the bons de commande and the approved extra expenses, so the three can
// never drift apart. That module is also where the `purchase_order_id IS NULL`
// exclusion — the anti-double-count rule — is applied.

/** Bons de commande of a project, for the register's « déjà compté » picker. */
export async function getProjectPurchaseOrdersForSelect(projectId: string) {
  return db
    .select({
      id: purchaseOrders.id,
      label: purchaseOrders.itemDescription,
      totalCost: purchaseOrders.totalCost,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, projectId))
    .orderBy(asc(purchaseOrders.itemDescription))
}
