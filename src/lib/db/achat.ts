import { db } from '@/db'
import { deliveryNotes, extraExpenses, projects, purchaseOrders, suppliers, users } from '@/db/schema'
import { eq, and, isNull, desc, count, sql } from 'drizzle-orm'

export type DeliveryNote = typeof deliveryNotes.$inferSelect
export type ExtraExpense = typeof extraExpenses.$inferSelect

export const NOTE_TYPE_LABELS: Record<string, string> = {
  livraison: 'Bon de livraison',
  retour: 'Bon de retour',
}

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
}

export const EXPENSE_CATEGORIES = [
  'Transport',
  'Carburant',
  'Petit matériel',
  'Main d’œuvre',
  'Restauration',
  'Autre',
]

export async function getDeliveryNotes(filters?: { type?: 'livraison' | 'retour' }) {
  return db
    .select({
      note: deliveryNotes,
      projectName: projects.name,
      supplierName: suppliers.name,
    })
    .from(deliveryNotes)
    .leftJoin(projects, eq(deliveryNotes.projectId, projects.id))
    .leftJoin(suppliers, eq(deliveryNotes.supplierId, suppliers.id))
    .where(
      and(
        isNull(deliveryNotes.deletedAt),
        filters?.type ? eq(deliveryNotes.noteType, filters.type) : undefined,
      )
    )
    .orderBy(desc(deliveryNotes.noteDate))
}

export async function getDeliveryNoteById(id: string) {
  const [row] = await db
    .select({
      note: deliveryNotes,
      projectName: projects.name,
      supplierName: suppliers.name,
    })
    .from(deliveryNotes)
    .leftJoin(projects, eq(deliveryNotes.projectId, projects.id))
    .leftJoin(suppliers, eq(deliveryNotes.supplierId, suppliers.id))
    .where(and(eq(deliveryNotes.id, id), isNull(deliveryNotes.deletedAt)))
  return row ?? null
}

export async function getNextDeliveryNoteReference(type: 'livraison' | 'retour') {
  const prefix = type === 'livraison' ? 'BL' : 'BR'
  const year = new Date().getFullYear()
  const [{ total }] = await db
    .select({ total: count() })
    .from(deliveryNotes)
    .where(eq(deliveryNotes.noteType, type))
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `${prefix}-${year}-${seq}`
}

export async function getExtraExpenses(filters?: { status?: string }) {
  return db
    .select({
      expense: extraExpenses,
      projectName: projects.name,
      creatorName: users.name,
    })
    .from(extraExpenses)
    .leftJoin(projects, eq(extraExpenses.projectId, projects.id))
    .leftJoin(users, eq(extraExpenses.createdBy, users.id))
    .where(
      and(
        isNull(extraExpenses.deletedAt),
        filters?.status
          ? eq(extraExpenses.status, filters.status as 'pending' | 'approved' | 'rejected')
          : undefined,
      )
    )
    .orderBy(desc(extraExpenses.expenseDate))
}

/**
 * Dépenses extra d'un projet + consommation budgétaire.
 * Utilisé par l'onglet « Achats » de la fiche projet : liste des dépenses
 * (avec photo + données OCR pour celles scannées via mobile) et pourcentage
 * de budget consommé (BC + dépenses approuvées, même règle que les alertes).
 */
export async function getProjectAchats(projectId: string) {
  const [project] = await db
    .select({ approvedBudget: projects.approvedBudget, currency: projects.currency })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  const rows = await db
    .select({ expense: extraExpenses, creatorName: users.name })
    .from(extraExpenses)
    .leftJoin(users, eq(extraExpenses.createdBy, users.id))
    .where(and(eq(extraExpenses.projectId, projectId), isNull(extraExpenses.deletedAt)))
    .orderBy(desc(extraExpenses.expenseDate))

  const [poRow] = await db
    .select({ total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text` })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, projectId))

  const approvedExpensesTotal = rows
    .filter((r) => r.expense.status === 'approved')
    .reduce((s, r) => s + Number(r.expense.amount), 0)

  const poTotal = parseFloat(poRow?.total ?? '0')
  const approved = project?.approvedBudget ? parseFloat(project.approvedBudget) : null
  const spent = poTotal + approvedExpensesTotal

  return {
    expenses: rows,
    currency: project?.currency ?? 'TND',
    budget: {
      approvedBudget: approved,
      poTotal,
      expensesTotal: approvedExpensesTotal,
      spent,
      percentSpent: approved && approved > 0 ? Math.round((spent / approved) * 1000) / 10 : null,
    },
  }
}

export async function getNextExpenseReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(extraExpenses)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `DEP-${year}-${seq}`
}

/** FOR-AC-10 : synthèse approvisionnement d'un chantier (BC + bons). */
export async function getProjectSupplyTracking(projectId: string) {
  const { purchaseOrders } = await import('@/db/schema')
  const [orders, notes] = await Promise.all([
    db
      .select({
        order: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(purchaseOrders.projectId, projectId))
      .orderBy(desc(purchaseOrders.purchaseDate)),
    db
      .select({
        note: deliveryNotes,
        supplierName: suppliers.name,
      })
      .from(deliveryNotes)
      .leftJoin(suppliers, eq(deliveryNotes.supplierId, suppliers.id))
      .where(and(eq(deliveryNotes.projectId, projectId), isNull(deliveryNotes.deletedAt)))
      .orderBy(desc(deliveryNotes.noteDate)),
  ])
  return { orders, notes }
}

export async function getProjectsForSelect() {
  return db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(projects.name)
}

export async function getSuppliersForSelect() {
  return db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .orderBy(suppliers.name)
}
