import { db } from '@/lib/db'
import { risksOpportunities, roActions, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type RiskOpportunity = typeof risksOpportunities.$inferSelect
export type RoAction = typeof roActions.$inferSelect

export async function getRisksOpportunities(filters?: {
  type?: 'risk' | 'opportunity'
  status?: string
}) {
  return db
    .select({
      ro: risksOpportunities,
      creatorName: users.name,
    })
    .from(risksOpportunities)
    .leftJoin(users, eq(risksOpportunities.createdBy, users.id))
    .where(
      and(
        isNull(risksOpportunities.deletedAt),
        filters?.type ? eq(risksOpportunities.type, filters.type) : undefined,
        filters?.status ? eq(risksOpportunities.status, filters.status as 'identified' | 'treated' | 'monitored' | 'closed') : undefined,
      )
    )
    .orderBy(desc(risksOpportunities.createdAt))
}

export async function getRiskOpportunityById(id: string) {
  const [ro] = await db
    .select()
    .from(risksOpportunities)
    .where(and(eq(risksOpportunities.id, id), isNull(risksOpportunities.deletedAt)))
  if (!ro) return null
  const actions = await db
    .select()
    .from(roActions)
    .where(eq(roActions.roId, id))
    .orderBy(roActions.createdAt)
  return { ro, actions }
}

export async function getNextRoReference(type: 'risk' | 'opportunity') {
  const prefix = type === 'risk' ? 'R' : 'O'
  const year = new Date().getFullYear()
  const [{ total }] = await db
    .select({ total: count() })
    .from(risksOpportunities)
    .where(eq(risksOpportunities.type, type))
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `${prefix}-${year}-${seq}`
}
