import { db } from '@/db'
import { regulatoryWatch, users } from '@/db/schema'
import { eq, and, isNull, asc, desc } from 'drizzle-orm'

export type RegulatoryWatchEntry = typeof regulatoryWatch.$inferSelect

export async function getRegulatoryWatchEntries(status?: string) {
  return db
    .select({ entry: regulatoryWatch, creatorName: users.name })
    .from(regulatoryWatch)
    .leftJoin(users, eq(regulatoryWatch.createdBy, users.id))
    .where(
      and(
        isNull(regulatoryWatch.deletedAt),
        status ? eq(regulatoryWatch.status, status as 'applicable' | 'non_applicable' | 'en_veille') : undefined,
      )
    )
    .orderBy(asc(regulatoryWatch.domain), desc(regulatoryWatch.effectiveDate))
}

export async function getRegulatoryWatchById(id: string) {
  const [entry] = await db
    .select()
    .from(regulatoryWatch)
    .where(and(eq(regulatoryWatch.id, id), isNull(regulatoryWatch.deletedAt)))
  return entry ?? null
}
