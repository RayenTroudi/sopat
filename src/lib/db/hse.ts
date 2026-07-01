import { db } from '@/db'
import { hseChecklistItems, hseChecklistSubmissions, hseChecklistAnswers, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export type HseItem = typeof hseChecklistItems.$inferSelect
export type HseSubmission = typeof hseChecklistSubmissions.$inferSelect

export async function getHseItems() {
  return db
    .select()
    .from(hseChecklistItems)
    .where(eq(hseChecklistItems.isActive, true))
    .orderBy(hseChecklistItems.sortOrder)
}

export async function getHseSubmissions() {
  return db
    .select({ submission: hseChecklistSubmissions, creatorName: users.name })
    .from(hseChecklistSubmissions)
    .leftJoin(users, eq(hseChecklistSubmissions.createdBy, users.id))
    .orderBy(desc(hseChecklistSubmissions.submittedDate))
}

export async function getHseSubmissionWithAnswers(submissionId: string) {
  const [submission] = await db
    .select()
    .from(hseChecklistSubmissions)
    .where(eq(hseChecklistSubmissions.id, submissionId))
  if (!submission) return null
  const answers = await db
    .select({ answer: hseChecklistAnswers, item: hseChecklistItems })
    .from(hseChecklistAnswers)
    .leftJoin(hseChecklistItems, eq(hseChecklistAnswers.itemId, hseChecklistItems.id))
    .where(eq(hseChecklistAnswers.submissionId, submissionId))
  return { submission, answers }
}
