'use server'

import { db } from '@/db'
import { deliveryNotes, extraExpenses, type DeliveryNoteItem } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq, and, isNull } from 'drizzle-orm'
import { getNextDeliveryNoteReference, getNextExpenseReference } from '@/lib/db/achat'
import { syncBudgetConsumption } from '@/lib/budget-consumption'
import { recordAudit, diffFields } from '@/lib/audit'

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
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(extraExpenses).values({
      reference,
      projectId: data.projectId || null,
      expenseDate: data.expenseDate,
      category: data.category,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'TND',
      justification: data.justification,
      createdBy: session.user.userId,
    }).returning({ id: extraExpenses.id })

    await recordAudit(tx, {
      entityType: 'extra_expense',
      entityId: created.id,
      action: 'created',
      actor: session.user,
      newState: {
        reference,
        projectId: data.projectId || null,
        expenseDate: data.expenseDate,
        category: data.category ?? null,
        description: data.description,
        amount: data.amount,
        currency: data.currency || 'TND',
        status: 'pending',
      },
    })
  })

  revalidatePath('/admin/achat/extra-expenses')
  // En attente : pas encore dans la consommation, mais visible dans le total
  // « en attente » de l'onglet Achats du projet.
  if (data.projectId) revalidatePath(`/admin/projects/${data.projectId}`)
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

  const updated = await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ status: extraExpenses.status, amount: extraExpenses.amount })
      .from(extraExpenses)
      .where(eq(extraExpenses.id, id))
      .limit(1)
    if (!before) return null

    const [row] = await tx
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

    await recordAudit(tx, {
      entityType: 'extra_expense',
      entityId: id,
      action: decision === 'approved' ? 'approved' : 'rejected',
      actor: session.user,
      previousState: { status: before.status },
      newState: { status: decision, ...(decision === 'rejected' ? { rejectReason: rejectReason ?? null } : {}) },
      // Le montant validé est le chiffre qui entre (ou sort) de la
      // consommation budgétaire : le figer ici évite de devoir le reconstituer.
      metadata: { amount: before.amount },
    })

    return row
  })

  if (!updated) return { success: false, error: 'Dépense introuvable' }

  revalidatePath('/admin/achat/extra-expenses')
  // Approuver AJOUTE à la consommation ; rejeter une dépense déjà approuvée la
  // RETIRE. Les deux sens doivent resynchroniser.
  await syncBudgetConsumption(updated?.projectId, session.user.userId)
  return { success: true }
}

export async function updateExtraExpense(
  id: string,
  data: {
    expenseDate?: string
    // `undefined` = champ non soumis (inchangé) ; `null` = catégorie effacée.
    // Sans cette distinction, Drizzle ignorait la valeur et une catégorie ne
    // pouvait pas être retirée.
    category?: string | null
    description?: string
    amount?: string
    ocrSuggested?: Record<string, unknown> | null
  },
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageAchat(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  if (data.amount !== undefined) {
    if (!/^\d+(\.\d{1,3})?$/.test(data.amount) || parseFloat(data.amount) <= 0)
      return { success: false, error: 'Montant invalide' }
  }
  if (data.description !== undefined && data.description.trim() === '')
    return { success: false, error: 'Description requise' }

  const updated = await db.transaction(async (tx) => {
    // L'état AVANT sert à ne journaliser que ce qui change réellement.
    const [before] = await tx
      .select({
        reference:   extraExpenses.reference,
        expenseDate: extraExpenses.expenseDate,
        category:    extraExpenses.category,
        description: extraExpenses.description,
        amount:      extraExpenses.amount,
        status:      extraExpenses.status,
      })
      .from(extraExpenses)
      .where(and(eq(extraExpenses.id, id), isNull(extraExpenses.deletedAt)))
      .limit(1)
    if (!before) return null

    const [row] = await tx
      .update(extraExpenses)
      .set({
        expenseDate:  data.expenseDate,
        category:     data.category,
        description:  data.description,
        amount:       data.amount,
        ocrSuggested: data.ocrSuggested,
        updatedAt:    new Date(),
      })
      .where(and(eq(extraExpenses.id, id), isNull(extraExpenses.deletedAt)))
      .returning({ projectId: extraExpenses.projectId, status: extraExpenses.status })

    const changed = diffFields(before, {
      expenseDate: data.expenseDate,
      category:    data.category,
      description: data.description,
      amount:      data.amount,
    })
    // Un enregistrement soumis sans modification ne salit pas le journal.
    if (changed) {
      await recordAudit(tx, {
        entityType: 'extra_expense',
        entityId: id,
        action: 'updated',
        actor: session.user,
        previousState: changed.previous,
        newState: changed.next,
        // Modifier une dépense déjà approuvée déplace la consommation
        // budgétaire : le statut au moment du fait rend la trace lisible.
        metadata: { reference: before.reference, statusAtChange: before.status },
      })
    }

    return row
  })

  if (!updated) return { success: false, error: 'Dépense introuvable' }

  revalidatePath('/admin/achat/extra-expenses')
  if (updated.projectId) revalidatePath(`/admin/projects/${updated.projectId}`)

  // Seul le montant d'une dépense approuvée entre dans la consommation ; une
  // dépense en attente n'y compte pas encore.
  if (updated.status === 'approved') {
    await syncBudgetConsumption(updated.projectId, session.user.userId)
  }
  return { success: true }
}

export async function deleteExtraExpense(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageAchat(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  const deleted = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(extraExpenses)
      .set({ deletedAt: new Date() })
      .where(and(eq(extraExpenses.id, id), isNull(extraExpenses.deletedAt)))
      .returning({
        projectId: extraExpenses.projectId,
        status:    extraExpenses.status,
        reference: extraExpenses.reference,
        amount:    extraExpenses.amount,
      })
    if (!row) return null

    // Suppression logique : l'enregistrement reste en base, la trace dit qui
    // l'a retiré et quel montant sortait alors de la consommation.
    await recordAudit(tx, {
      entityType: 'extra_expense',
      entityId: id,
      action: 'deleted',
      actor: session.user,
      previousState: { deletedAt: null, status: row.status, amount: row.amount },
      newState: { deletedAt: new Date().toISOString() },
      metadata: { reference: row.reference },
    })

    return row
  })

  revalidatePath('/admin/achat/extra-expenses')
  // Supprimer une dépense approuvée retire son montant de la consommation ;
  // une dépense en attente n'y comptait pas, mais elle disparaît du total
  // « en attente » affiché sur la fiche projet.
  if (deleted?.projectId) {
    if (deleted.status === 'approved') {
      await syncBudgetConsumption(deleted.projectId, session.user.userId)
    } else {
      revalidatePath(`/admin/projects/${deleted.projectId}`)
    }
  }
  return { success: true }
}
