/**
 * THE canonical definition of a project's budget consumption.
 *
 * Every screen that answers "how much of this chantier's budget is used?" must
 * come through here. Before this module the rule was written out four times and
 * three of them had drifted:
 *
 *   getProjectAchats / checkBudgetThresholdAndNotify → BC + dépenses + FOR-AC-10
 *   getAllProjects (liste projets)                   → BC + dépenses
 *   getAvgBudgetVariance / getAtRiskProjects         → BC seulement
 *
 * so the same chantier could sit at 92 % on its own page, 88 % in the projects
 * list and 71 % on the dashboard, and the 90 % alert could fire against a
 * figure no widget displayed. The rule is defined once, here, and imported.
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 *
 *   spent = Σ purchase_orders.total_cost
 *         + Σ extra_expenses.amount        WHERE status = 'approved'
 *         + Σ FOR-AC-10 purchase lines TTC WHERE purchase_order_id IS NULL
 *         + Σ equipment_rentals.total_cost WHERE deleted_at IS NULL
 *
 * Each term is a disjoint set of records, so nothing is counted twice:
 *
 * - Pending extra expenses are excluded: the direction can still reject them.
 *   They are reported separately as `pendingTotal` so a freshly scanned receipt
 *   is still visible, but they never move the consumed figure.
 * - Soft-deleted expenses and registers are excluded.
 * - A FOR-AC-10 purchase line naming the bon de commande that covers it
 *   (`purchase_order_id IS NOT NULL`) is excluded, because the first term
 *   already carries that amount. This is the whole reason that column exists;
 *   see migration 0033.
 * - FOR-AC-10 lines are taken TTC — the cash that actually leaves the company,
 *   and the column the source workbook totals as « Somme des dépenses ». With
 *   the default VAT rate of 0, TTC equals HTVA, so rows created or imported
 *   before VAT was configurable contribute exactly what they always did.
 * - Equipment rentals are money spent on the chantier like any other, and live
 *   in their own table with no overlap with the three above. They were added
 *   to the rule by an explicit business decision; `budget-reconciliation`
 *   already counted them, and leaving them out made that screen disagree with
 *   every other one. Soft-deleted rentals are excluded.
 *
 * Adding a term raises every project's consumption, so it can push a chantier
 * across the 90 % / 100 % alert thresholds. That is the alert mechanism working,
 * not a regression: `checkBudgetThresholdAndNotify` is deliberately left to
 * fire on the new figure.
 *
 * `getProjectSpend` is a thin wrapper over `getProjectSpendMap`, so a single
 * project and a dashboard batch can never diverge: there is one query set.
 */
import { db } from '@/db'
import {
  equipmentRentals,
  extraExpenses,
  purchaseOrders,
  supplyItems,
  supplyPurchases,
  supplyRegisters,
} from '@/db/schema'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'

export type ProjectSpend = {
  /** Σ purchase_orders.total_cost */
  poTotal: number
  /** Σ approved extra_expenses.amount */
  expensesTotal: number
  /** Σ FOR-AC-10 purchase lines TTC not already carried by a bon de commande. */
  supplyTotal: number
  /** Σ equipment_rentals.total_cost, excluding soft-deleted rentals. */
  equipmentTotal: number
  /** The consumed figure: poTotal + expensesTotal + supplyTotal + equipmentTotal. */
  spent: number
  /** Pending extra expenses — shown separately, never part of `spent`. */
  pendingTotal: number
}

export const ZERO_SPEND: ProjectSpend = {
  poTotal: 0, expensesTotal: 0, supplyTotal: 0, equipmentTotal: 0,
  spent: 0, pendingTotal: 0,
}

/** Budget consumption for many projects at once — one query per term, no N+1. */
export async function getProjectSpendMap(
  projectIds: string[]
): Promise<Map<string, ProjectSpend>> {
  const result = new Map<string, ProjectSpend>()
  if (projectIds.length === 0) return result

  const [poRows, expenseRows, supplyRows, equipmentRows] = await Promise.all([
    db
      .select({
        projectId: purchaseOrders.projectId,
        total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text`,
      })
      .from(purchaseOrders)
      .where(inArray(purchaseOrders.projectId, projectIds))
      .groupBy(purchaseOrders.projectId),

    db
      .select({
        projectId: extraExpenses.projectId,
        approved: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric)
          filter (where ${extraExpenses.status} = 'approved'), 0)::text`,
        pending: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric)
          filter (where ${extraExpenses.status} = 'pending'), 0)::text`,
      })
      .from(extraExpenses)
      .where(and(
        inArray(extraExpenses.projectId, projectIds),
        isNull(extraExpenses.deletedAt),
      ))
      .groupBy(extraExpenses.projectId),

    // FOR-AC-10: TTC of the lines no bon de commande already accounts for.
    db
      .select({
        projectId: supplyRegisters.projectId,
        total: sql<string>`coalesce(sum(
          (${supplyPurchases.quantity}::numeric * ${supplyPurchases.unitPriceHtva}::numeric)
          * (1 + ${supplyPurchases.vatRate}::numeric)
        ), 0)::text`,
      })
      .from(supplyPurchases)
      .innerJoin(supplyItems, eq(supplyPurchases.itemId, supplyItems.id))
      .innerJoin(supplyRegisters, eq(supplyItems.registerId, supplyRegisters.id))
      .where(and(
        inArray(supplyRegisters.projectId, projectIds),
        isNull(supplyRegisters.deletedAt),
        isNull(supplyPurchases.purchaseOrderId),
      ))
      .groupBy(supplyRegisters.projectId),

    db
      .select({
        projectId: equipmentRentals.projectId,
        total: sql<string>`coalesce(sum(${equipmentRentals.totalCost}::numeric), 0)::text`,
      })
      .from(equipmentRentals)
      .where(and(
        inArray(equipmentRentals.projectId, projectIds),
        isNull(equipmentRentals.deletedAt),
      ))
      .groupBy(equipmentRentals.projectId),
  ])

  for (const id of projectIds) result.set(id, { ...ZERO_SPEND })

  const bump = (id: string | null, patch: Partial<ProjectSpend>) => {
    if (!id) return
    const current = result.get(id)
    if (!current) return
    Object.assign(current, patch)
  }

  for (const r of poRows) bump(r.projectId, { poTotal: Number(r.total) })
  for (const r of expenseRows) {
    bump(r.projectId, { expensesTotal: Number(r.approved), pendingTotal: Number(r.pending) })
  }
  for (const r of supplyRows) bump(r.projectId, { supplyTotal: Number(r.total) })
  for (const r of equipmentRows) bump(r.projectId, { equipmentTotal: Number(r.total) })

  for (const spend of result.values()) {
    spend.spent =
      spend.poTotal + spend.expensesTotal + spend.supplyTotal + spend.equipmentTotal
  }

  return result
}

/** Budget consumption for one project, by the same rule as every other caller. */
export async function getProjectSpend(projectId: string): Promise<ProjectSpend> {
  const map = await getProjectSpendMap([projectId])
  return map.get(projectId) ?? { ...ZERO_SPEND }
}

/**
 * Consumption as a percentage of the approved budget, rounded to one decimal.
 * Null when there is no budget to measure against — never Infinity.
 */
export function spendPercent(spent: number, approvedBudget: number | null): number | null {
  if (approvedBudget === null || !(approvedBudget > 0)) return null
  return Math.round((spent / approvedBudget) * 1000) / 10
}
