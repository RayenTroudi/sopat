import { db } from '@/db'
import { documentReviews, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type DocumentReview = typeof documentReviews.$inferSelect

export const DOC_REVIEW_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
}

export async function getDocumentReviews(filters?: { status?: string }) {
  return db
    .select({
      review: documentReviews,
      creatorName: users.name,
    })
    .from(documentReviews)
    .leftJoin(users, eq(documentReviews.createdBy, users.id))
    .where(
      and(
        isNull(documentReviews.deletedAt),
        filters?.status
          ? eq(documentReviews.status, filters.status as 'planned' | 'in_progress' | 'completed')
          : undefined,
      )
    )
    .orderBy(desc(documentReviews.reviewDate))
}

export async function getNextDocReviewReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(documentReviews)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `RDOC-${year}-${seq}`
}
