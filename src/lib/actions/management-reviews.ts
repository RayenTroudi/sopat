'use server'

import { db } from '@/db'
import { managementReviews, managementReviewActions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextReviewReference } from '@/lib/db/management-reviews'

type ReviewInputs = Partial<{
  participants: string
  agenda: string
  previousActionsStatus: string
  contextChanges: string
  customerSatisfaction: string
  qualityObjectivesReview: string
  processPerformance: string
  ncCapaStatus: string
  auditResults: string
  supplierPerformance: string
  resourceAdequacy: string
  risksOpportunitiesReview: string
  improvementOpportunities: string
  conclusions: string
}>

function requireDirection(role: string) {
  return role === 'admin' || role === 'direction'
}

export async function createManagementReview(data: { reviewDate: string } & ReviewInputs) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!requireDirection(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const reference = await getNextReviewReference()
  const [row] = await db.insert(managementReviews).values({
    reference,
    reviewDate: data.reviewDate,
    participants: data.participants,
    agenda: data.agenda,
    previousActionsStatus: data.previousActionsStatus,
    contextChanges: data.contextChanges,
    customerSatisfaction: data.customerSatisfaction,
    qualityObjectivesReview: data.qualityObjectivesReview,
    processPerformance: data.processPerformance,
    ncCapaStatus: data.ncCapaStatus,
    auditResults: data.auditResults,
    supplierPerformance: data.supplierPerformance,
    resourceAdequacy: data.resourceAdequacy,
    risksOpportunitiesReview: data.risksOpportunitiesReview,
    improvementOpportunities: data.improvementOpportunities,
    conclusions: data.conclusions,
    createdBy: session.user.userId,
  }).returning({ id: managementReviews.id })

  revalidatePath('/admin/management-reviews')
  return { success: true, id: row.id }
}

export async function updateManagementReview(
  id: string,
  data: ReviewInputs & Partial<{ reviewDate: string; status: 'planned' | 'held' | 'closed' }>,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!requireDirection(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  await db
    .update(managementReviews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(managementReviews.id, id))

  revalidatePath('/admin/management-reviews')
  revalidatePath(`/admin/management-reviews/${id}`)
  return { success: true }
}

export async function deleteManagementReview(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!requireDirection(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  await db
    .update(managementReviews)
    .set({ deletedAt: new Date() })
    .where(eq(managementReviews.id, id))
  revalidatePath('/admin/management-reviews')
  return { success: true }
}

export async function addReviewAction(data: {
  reviewId: string
  type: 'amelioration' | 'ressources' | 'changement_smq' | 'autre'
  description: string
  responsible?: string
  targetDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!requireDirection(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  await db.insert(managementReviewActions).values({
    reviewId: data.reviewId,
    type: data.type,
    description: data.description,
    responsible: data.responsible,
    targetDate: data.targetDate,
    createdBy: session.user.userId,
  })
  revalidatePath(`/admin/management-reviews/${data.reviewId}`)
  return { success: true }
}

export async function completeReviewAction(actionId: string, reviewId: string, result?: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!requireDirection(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  await db
    .update(managementReviewActions)
    .set({ completedAt: new Date(), result, updatedAt: new Date() })
    .where(eq(managementReviewActions.id, actionId))
  revalidatePath(`/admin/management-reviews/${reviewId}`)
  return { success: true }
}
