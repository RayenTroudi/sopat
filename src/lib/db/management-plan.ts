import { db } from '@/db'
import { managementPlanActivities, managementPlanExecutions, communicationPlan, users } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

export type MgmtActivity = typeof managementPlanActivities.$inferSelect
export type MgmtExecution = typeof managementPlanExecutions.$inferSelect
export type CommPlan = typeof communicationPlan.$inferSelect

export async function getManagementPlanActivities(year: number) {
  return db
    .select({ activity: managementPlanActivities, creatorName: users.name })
    .from(managementPlanActivities)
    .leftJoin(users, eq(managementPlanActivities.createdBy, users.id))
    .where(and(eq(managementPlanActivities.year, year), isNull(managementPlanActivities.deletedAt)))
    .orderBy(managementPlanActivities.dept, managementPlanActivities.sortOrder)
}

export async function getExecutionsForYear(year: number) {
  return db
    .select()
    .from(managementPlanExecutions)
    .where(eq(managementPlanExecutions.year, year))
}

export async function getCommunicationPlan(year: number) {
  return db
    .select({ comm: communicationPlan, creatorName: users.name })
    .from(communicationPlan)
    .leftJoin(users, eq(communicationPlan.createdBy, users.id))
    .where(and(eq(communicationPlan.year, year), isNull(communicationPlan.deletedAt)))
    .orderBy(communicationPlan.direction, communicationPlan.plannedDate)
}
