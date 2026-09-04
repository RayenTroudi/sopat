'use server'

import { db } from '@/db'
import { documentReviews } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import {
  getNextDocReviewReference,
  updateDocumentReview,
  type UpdateDocumentReviewInput,
} from '@/lib/db/document-reviews'
import { recordAudit } from '@/lib/audit'

function canManage(role: string) {
  return ['admin', 'direction'].includes(role)
}

export async function createDocumentReview(data: {
  reviewDate: string
  processCode?: string
  scope?: string
  documentsCount?: number
  findings?: string
  decisions?: string
  nextReviewDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const reference = await getNextDocReviewReference()

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(documentReviews)
      .values({
        reference,
        reviewDate: data.reviewDate,
        processCode: (data.processCode || null) as typeof documentReviews.$inferInsert.processCode,
        scope: data.scope,
        documentsCount: data.documentsCount,
        findings: data.findings,
        decisions: data.decisions,
        nextReviewDate: data.nextReviewDate || null,
        createdBy: session.user.userId,
      })
      .returning({ id: documentReviews.id })

    // La création était jusqu'ici la seule opération non journalisée du module :
    // sans elle, l'historique d'une revue commençait à sa première modification.
    await recordAudit(tx, {
      entityType: 'document_review',
      entityId: created.id,
      action: 'created',
      actor: {
        userId: session.user.userId,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      newState: { reference, reviewDate: data.reviewDate, scope: data.scope ?? null },
      metadata: { reference },
    })

    return created.id
  })

  revalidatePath('/admin/document-reviews')
  return { success: true, id }
}

/**
 * Édition d'une revue existante depuis l'interface.
 *
 * Délègue au même service que la route PATCH : la règle « une revue terminée ne
 * se modifie qu'avec un motif, et cela crée une révision » ne doit exister
 * qu'à un seul endroit, sinon l'un des deux chemins finira par la perdre.
 */
export async function saveDocumentReview(id: string, input: UpdateDocumentReviewInput) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const result = await updateDocumentReview(id, input, {
    userId: session.user.userId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  })

  if (!result.ok) return { success: false, error: result.error }

  revalidatePath('/admin/document-reviews')
  revalidatePath(`/admin/document-reviews/${id}`)
  return { success: true, revisionNumber: result.revisionNumber, revised: result.revised }
}

export async function updateDocumentReviewStatus(
  id: string,
  status: 'planned' | 'in_progress' | 'completed',
  changeReason?: string,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  // Passe par le service plutôt que par un UPDATE direct : une transition de
  // statut est une décision qualité, et elle doit laisser la même trace qu'une
  // modification de contenu (elle écrit aussi la signature de clôture).
  const result = await updateDocumentReview(id, { status, changeReason }, {
    userId: session.user.userId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  })

  if (!result.ok) return { success: false, error: result.error }

  revalidatePath('/admin/document-reviews')
  return { success: true }
}

/** Suppression logique — « Never delete records ». */
export async function softDeleteDocumentReview(id: string, reason: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }
  if (!reason.trim()) return { success: false, error: 'Motif obligatoire' }

  await db.transaction(async (tx) => {
    await tx
      .update(documentReviews)
      .set({ deletedAt: new Date(), updatedBy: session.user.userId, updatedAt: new Date() })
      .where(eq(documentReviews.id, id))

    await recordAudit(tx, {
      entityType: 'document_review',
      entityId: id,
      action: 'deleted',
      actor: {
        userId: session.user.userId,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      metadata: { changeReason: reason.trim() },
    })
  })

  revalidatePath('/admin/document-reviews')
  return { success: true }
}
