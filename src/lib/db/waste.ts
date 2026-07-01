import { db } from '@/db'
import { wasteRecords, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export type WasteRecord = typeof wasteRecords.$inferSelect

export async function getWasteRecords(year?: number) {
  return db
    .select({ record: wasteRecords, creatorName: users.name })
    .from(wasteRecords)
    .leftJoin(users, eq(wasteRecords.createdBy, users.id))
    .where(year ? eq(wasteRecords.year, year) : undefined)
    .orderBy(desc(wasteRecords.year), desc(wasteRecords.month))
}
