'use server'

import { db } from '@/db'
import { deliveryNotes, extraExpenses, type DeliveryNoteItem } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextDeliveryNoteReference, getNextExpenseReference } from '@/lib/db/achat'
import { checkBudgetThresholdAndNotify } from '@/lib/notifications'

function canManageAchat(role: string) {
  return ['admin', 'direction', 'realisation_chef', 'etudes_chef'].includes(role)
}

export async function createDeliveryNote(data: {
  noteType: 'livraison' | 'retour'
  noteDate: string
  projectId?: string
  supplierId?: string
  counterparty?: string
  items: DeliveryNoteItem[]
  driverName?: string
  receiverName?: string
  observations?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageAchat(session.user.role))
    return { success: false, error: 'Accès non autorisé' }
  if (!data.items.length)
    return { success: false, error: 'Ajoutez au moins un article' }

  const reference = await getNextDeliveryNoteReference(data.noteType)
  const [row] = await db.insert(deliveryNotes).values({
    reference,
    noteType: data.noteType,
    noteDate: data.noteDate,
    projectId: data.projectId || null,
    supplierId: data.supplierId || null,
    counterparty: data.counterparty,
    items: data.items,
    driverName: data.driverName,
    receiverName: data.receiverName,
    observations: data.observations,
    createdBy: session.user.userId,
  }).returning({ id: deliveryNotes.id })

  revalidatePath('/admin/achat/delivery-notes')
  return { success: true, id: row.id }
}

export async function deleteDeliveryNote(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageAchat(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  await db
    .update(deliveryNotes)
    .set({ deletedAt: new Date() })
    .where(eq(deliveryNotes.id, id))
  revalidatePath('/admin/achat/delivery-notes')
  return { success: true }
}

export async function createExtraExpense(data: {
  projectId?: string
  expenseDate: string
  category?: string
  description: string
  amount: string
  currency?: string
  justification?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageAchat(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  const reference = await getNextExpenseReference()
  await db.insert(extraExpenses).values({
    reference,
    projectId: data.projectId || null,
    expenseDate: data.expenseDate,
    category: data.category,
    description: data.description,
    amount: data.amount,
    currency: data.currency || 'TND',
    justification: data.justification,
    createdBy: session.user.userId,
  })

  revalidatePath('/admin/achat/extra-expenses')
  return { success: true }
}

export async function decideExtraExpense(
  id: string,
  decision: 'approved' | 'rejected',
  rejectReason?: string,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  // La validation des dépenses est réservée à la direction
  if (!['admin', 'direction'].includes(session.user.role))
    return { success: false, error: 'Validation réservée à la direction' }

  const [updated] = await db
    .update(extraExpenses)
    .set({
      status: decision,
      approvedBy: session.user.userId,
      approvedAt: new Date(),
      rejectReason: decision === 'rejected' ? rejectReason : null,
      updatedAt: new Date(),
    })
    .where(eq(extraExpenses.id, id))
    .returning({ projectId: extraExpenses.projectId })

  if (decision === 'approved' && updated?.projectId) {
    await checkBudgetThresholdAndNotify(updated.projectId, session.user.userId)
  }

  revalidatePath('/admin/achat/extra-expenses')
  return { success: true }
}

export async function deleteExtraExpense(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageAchat(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  await db
    .update(extraExpenses)
    .set({ deletedAt: new Date() })
    .where(eq(extraExpenses.id, id))
  revalidatePath('/admin/achat/extra-expenses')
  return { success: true }
}
