'use server'

import { db } from '@/db'
import { documentReviews } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextDocReviewReference } from '@/lib/db/document-reviews'

function canManage(role: string) {
  return ['admin', 'direction'].includes(role)
}

export async function createDocumentReview(data: {
  reviewDate: string
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
  await db.insert(documentReviews).values({
    reference,
    reviewDate: data.reviewDate,
    scope: data.scope,
    documentsCount: data.documentsCount,
    findings: data.findings,
    decisions: data.decisions,
    nextReviewDate: data.nextReviewDate || null,
    createdBy: session.user.userId,
  })

  revalidatePath('/admin/document-reviews')
  return { success: true }
}

export async function updateDocumentReviewStatus(
  id: string,
  status: 'planned' | 'in_progress' | 'completed',
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  await db
    .update(documentReviews)
    .set({ status, updatedAt: new Date() })
    .where(eq(documentReviews.id, id))
  revalidatePath('/admin/document-reviews')
  return { success: true }
}
