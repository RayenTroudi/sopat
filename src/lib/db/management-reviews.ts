import { db } from '@/db'
import { managementReviews, managementReviewActions, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { z } from 'zod'

export type ManagementReview = typeof managementReviews.$inferSelect
export type ManagementReviewAction = typeof managementReviewActions.$inferSelect

export async function getManagementReviews(filters?: { status?: string }) {
  return db
    .select({
      review: managementReviews,
      creatorName: users.name,
    })
    .from(managementReviews)
    .leftJoin(users, eq(managementReviews.createdBy, users.id))
    .where(
      and(
        isNull(managementReviews.deletedAt),
        filters?.status
          ? eq(managementReviews.status, filters.status as 'planned' | 'held' | 'closed')
          : undefined,
      )
    )
    .orderBy(desc(managementReviews.reviewDate))
}

export async function getManagementReviewById(id: string) {
  const [review] = await db
    .select()
    .from(managementReviews)
    .where(and(eq(managementReviews.id, id), isNull(managementReviews.deletedAt)))
  if (!review) return null
  const actions = await db
    .select()
    .from(managementReviewActions)
    .where(eq(managementReviewActions.reviewId, id))
    .orderBy(managementReviewActions.createdAt)
  return { review, actions }
}

export async function getNextReviewReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db
    .select({ total: count() })
    .from(managementReviews)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `RD-${year}-${seq}`
}

/**
 * Runtime contract for editing a management review (ISO 9.3).
 *
 * Lives here rather than in the server action so it can be exercised against a
 * real row without a request scope. The action authenticates and then delegates.
 */
export const reviewUpdateSchema = z.object({
  // Éléments d'entrée — ISO 9.3.2
  participants:             z.string().optional(),
  agenda:                   z.string().optional(),
  previousActionsStatus:    z.string().optional(),
  contextChanges:           z.string().optional(),
  customerSatisfaction:     z.string().optional(),
  qualityObjectivesReview:  z.string().optional(),
  processPerformance:       z.string().optional(),
  ncCapaStatus:             z.string().optional(),
  auditResults:             z.string().optional(),
  supplierPerformance:      z.string().optional(),
  resourceAdequacy:         z.string().optional(),
  risksOpportunitiesReview: z.string().optional(),
  improvementOpportunities: z.string().optional(),
  // Éléments de sortie — ISO 9.3.3
  conclusions:              z.string().optional(),
  // Planning
  reviewDate:               z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ)').optional(),
  status:                   z.enum(['planned', 'held', 'closed'] as const).optional(),
})

/**
 * Applies an edit to a management review.
 *
 * Unknown keys are stripped by the schema and the update lists fields by name,
 * so `id`, `reference`, `createdBy`, `createdAt` and `deletedAt` cannot be
 * written through this path however the payload is constructed.
 */
export async function applyManagementReviewUpdate(
  id: string,
  data: unknown,
): Promise<{ success: boolean; error?: string }> {
  const parsed = reviewUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
  }
  const d = parsed.data

  await db
    .update(managementReviews)
    .set({
      ...(d.participants             !== undefined && { participants: d.participants }),
      ...(d.agenda                   !== undefined && { agenda: d.agenda }),
      ...(d.previousActionsStatus    !== undefined && { previousActionsStatus: d.previousActionsStatus }),
      ...(d.contextChanges           !== undefined && { contextChanges: d.contextChanges }),
      ...(d.customerSatisfaction     !== undefined && { customerSatisfaction: d.customerSatisfaction }),
      ...(d.qualityObjectivesReview  !== undefined && { qualityObjectivesReview: d.qualityObjectivesReview }),
      ...(d.processPerformance       !== undefined && { processPerformance: d.processPerformance }),
      ...(d.ncCapaStatus             !== undefined && { ncCapaStatus: d.ncCapaStatus }),
      ...(d.auditResults             !== undefined && { auditResults: d.auditResults }),
      ...(d.supplierPerformance      !== undefined && { supplierPerformance: d.supplierPerformance }),
      ...(d.resourceAdequacy         !== undefined && { resourceAdequacy: d.resourceAdequacy }),
      ...(d.risksOpportunitiesReview !== undefined && { risksOpportunitiesReview: d.risksOpportunitiesReview }),
      ...(d.improvementOpportunities !== undefined && { improvementOpportunities: d.improvementOpportunities }),
      ...(d.conclusions              !== undefined && { conclusions: d.conclusions }),
      ...(d.reviewDate               !== undefined && { reviewDate: d.reviewDate }),
      ...(d.status                   !== undefined && { status: d.status }),
      updatedAt: new Date(),
    })
    .where(eq(managementReviews.id, id))

  return { success: true }
}
