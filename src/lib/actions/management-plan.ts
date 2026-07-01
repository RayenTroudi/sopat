'use server'

import { db } from '@/db'
import { managementPlanActivities, managementPlanExecutions, communicationPlan } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'

export async function createManagementActivity(data: {
  year: number
  dept: string
  objective: string
  action: string
  responsible?: string
  plannedWeeks?: number[]
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(managementPlanActivities).values({
    year: data.year,
    dept: data.dept as 'AC' | 'CO' | 'ET' | 'MI' | 'RE1' | 'RE2' | 'RH',
    objective: data.objective,
    action: data.action,
    responsible: data.responsible,
    plannedWeeks: data.plannedWeeks ?? [],
    createdBy: session.user.userId,
  })
  revalidatePath('/admin/management-plan')
  return { success: true }
}

export async function upsertExecution(data: {
  activityId: string
  week: number
  year: number
  status: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const existing = await db
    .select()
    .from(managementPlanExecutions)
    .where(
      and(
        eq(managementPlanExecutions.activityId, data.activityId),
        eq(managementPlanExecutions.week, data.week),
        eq(managementPlanExecutions.year, data.year),
      )
    )

  if (existing.length > 0) {
    await db
      .update(managementPlanExecutions)
      .set({ status: data.status as 'planifie' | 'realise_dans_delai' | 'realise_avec_retard' | 'non_realise' | 'cloture', notes: data.notes, updatedAt: new Date() })
      .where(eq(managementPlanExecutions.id, existing[0].id))
  } else {
    await db.insert(managementPlanExecutions).values({
      activityId: data.activityId,
      week: data.week,
      year: data.year,
      status: data.status as 'planifie' | 'realise_dans_delai' | 'realise_avec_retard' | 'non_realise' | 'cloture',
      notes: data.notes,
      createdBy: session.user.userId,
    })
  }
  revalidatePath('/admin/management-plan')
  return { success: true }
}

export async function createCommunicationEntry(data: {
  year: number
  direction: string
  subject: string
  target?: string
  channel?: string
  frequency?: string
  responsible?: string
  plannedDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(communicationPlan).values({
    year: data.year,
    direction: data.direction as 'interne' | 'externe',
    subject: data.subject,
    target: data.target,
    channel: data.channel,
    frequency: data.frequency,
    responsible: data.responsible,
    plannedDate: data.plannedDate,
    createdBy: session.user.userId,
  })
  revalidatePath('/admin/management-plan')
  return { success: true }
}
