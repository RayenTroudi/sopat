import { db } from '@/db'
import { managementReviews, managementReviewActions, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

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
