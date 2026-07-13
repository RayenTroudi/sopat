import { db } from '@/db'
import { deliveryNotes, extraExpenses, projects, suppliers, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

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

export async function getNextExpenseReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(extraExpenses)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `DEP-${year}-${seq}`
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
