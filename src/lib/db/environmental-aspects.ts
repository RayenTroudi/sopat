import { db } from '@/db'
import { environmentalAspects, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type EnvironmentalAspect = typeof environmentalAspects.$inferSelect

export const AES_CONDITION_LABELS: Record<string, string> = {
  normale: 'Normale',
  anormale: 'Anormale',
  urgence: "Situation d'urgence",
}

export const AES_STATUS_LABELS: Record<string, string> = {
  identified: 'Identifié',
  controlled: 'Maîtrisé',
  closed: 'Clôturé',
}

/** Seuil de signification F×G (PLA MI 04) */
export const AES_SIGNIFICANCE_THRESHOLD = 9

export async function getEnvironmentalAspects(filters?: {
  status?: string
  significantOnly?: boolean
}) {
  return db
    .select({
      aspect: environmentalAspects,
      creatorName: users.name,
    })
    .from(environmentalAspects)
    .leftJoin(users, eq(environmentalAspects.createdBy, users.id))
    .where(
      and(
        isNull(environmentalAspects.deletedAt),
        filters?.status
          ? eq(environmentalAspects.status, filters.status as 'identified' | 'controlled' | 'closed')
          : undefined,
        filters?.significantOnly ? eq(environmentalAspects.isSignificant, true) : undefined,
      )
    )
    .orderBy(desc(environmentalAspects.significance))
}

export async function getEnvironmentalAspectById(id: string) {
  const [row] = await db
    .select()
    .from(environmentalAspects)
    .where(and(eq(environmentalAspects.id, id), isNull(environmentalAspects.deletedAt)))
  return row ?? null
}

export async function getNextAesReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(environmentalAspects)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `AES-${year}-${seq}`
}
