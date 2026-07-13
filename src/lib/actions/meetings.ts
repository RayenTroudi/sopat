'use server'

import { db } from '@/db'
import { meetingMinutes, meetingActionItems } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextMeetingReference } from '@/lib/db/meetings'

export async function createMeeting(data: {
  meetingDate: string
  meetingType?: string
  location?: string
  participants?: string
  absentees?: string
  agenda?: string
  discussions?: string
  decisions?: string
  nextMeetingDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }

  const reference = await getNextMeetingReference()
  const [row] = await db.insert(meetingMinutes).values({
    reference,
    meetingDate: data.meetingDate,
    meetingType: data.meetingType,
    location: data.location,
    participants: data.participants,
    absentees: data.absentees,
    agenda: data.agenda,
    discussions: data.discussions,
    decisions: data.decisions,
    nextMeetingDate: data.nextMeetingDate || null,
    createdBy: session.user.userId,
  }).returning({ id: meetingMinutes.id })

  revalidatePath('/admin/meetings')
  return { success: true, id: row.id }
}

export async function updateMeeting(
  id: string,
  data: Partial<{
    meetingDate: string
    meetingType: string
    location: string
    participants: string
    absentees: string
    agenda: string
    discussions: string
    decisions: string
    nextMeetingDate: string
  }>,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }

  await db
    .update(meetingMinutes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(meetingMinutes.id, id))
  revalidatePath('/admin/meetings')
  revalidatePath(`/admin/meetings/${id}`)
  return { success: true }
}

export async function deleteMeeting(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  await db
    .update(meetingMinutes)
    .set({ deletedAt: new Date() })
    .where(eq(meetingMinutes.id, id))
  revalidatePath('/admin/meetings')
  return { success: true }
}

export async function addMeetingAction(data: {
  meetingId: string
  description: string
  responsible?: string
  targetDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  await db.insert(meetingActionItems).values({
    meetingId: data.meetingId,
    description: data.description,
    responsible: data.responsible,
    targetDate: data.targetDate,
    createdBy: session.user.userId,
  })
  revalidatePath(`/admin/meetings/${data.meetingId}`)
  return { success: true }
}

export async function completeMeetingAction(actionId: string, meetingId: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  await db
    .update(meetingActionItems)
    .set({ completedAt: new Date(), updatedAt: new Date() })
    .where(eq(meetingActionItems.id, actionId))
  revalidatePath(`/admin/meetings/${meetingId}`)
  return { success: true }
}
