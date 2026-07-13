import { db } from '@/db'
import { meetingMinutes, meetingActionItems, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type MeetingMinute = typeof meetingMinutes.$inferSelect
export type MeetingActionItem = typeof meetingActionItems.$inferSelect

export async function getMeetings(filters?: { type?: string }) {
  return db
    .select({
      meeting: meetingMinutes,
      creatorName: users.name,
    })
    .from(meetingMinutes)
    .leftJoin(users, eq(meetingMinutes.createdBy, users.id))
    .where(
      and(
        isNull(meetingMinutes.deletedAt),
        filters?.type ? eq(meetingMinutes.meetingType, filters.type) : undefined,
      )
    )
    .orderBy(desc(meetingMinutes.meetingDate))
}

export async function getMeetingById(id: string) {
  const [meeting] = await db
    .select()
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.id, id), isNull(meetingMinutes.deletedAt)))
  if (!meeting) return null
  const actions = await db
    .select()
    .from(meetingActionItems)
    .where(eq(meetingActionItems.meetingId, id))
    .orderBy(meetingActionItems.createdAt)
  return { meeting, actions }
}

export async function getNextMeetingReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(meetingMinutes)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `PV-${year}-${seq}`
}
