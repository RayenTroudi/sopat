import { db } from '@/db'
import { stakeholders, stakeholderFeedback, staffSuggestions, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type Stakeholder = typeof stakeholders.$inferSelect
export type StakeholderFeedback = typeof stakeholderFeedback.$inferSelect
export type StaffSuggestion = typeof staffSuggestions.$inferSelect

export async function getStakeholders() {
  return db
    .select({ sh: stakeholders, creatorName: users.name })
    .from(stakeholders)
    .leftJoin(users, eq(stakeholders.createdBy, users.id))
    .where(isNull(stakeholders.deletedAt))
    .orderBy(stakeholders.name)
}

export async function getStakeholderById(id: string) {
  const [sh] = await db
    .select()
    .from(stakeholders)
    .where(and(eq(stakeholders.id, id), isNull(stakeholders.deletedAt)))
  if (!sh) return null
  const feedback = await db
    .select()
    .from(stakeholderFeedback)
    .where(eq(stakeholderFeedback.stakeholderId, id))
    .orderBy(desc(stakeholderFeedback.date))
  return { sh, feedback }
}

export async function getStaffSuggestions() {
  return db
    .select({ s: staffSuggestions, creatorName: users.name })
    .from(staffSuggestions)
    .leftJoin(users, eq(staffSuggestions.createdBy, users.id))
    .orderBy(desc(staffSuggestions.date))
}

export async function getNextStakeholderReference() {
  const [{ total }] = await db.select({ total: count() }).from(stakeholders)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `PI-${seq}`
}
