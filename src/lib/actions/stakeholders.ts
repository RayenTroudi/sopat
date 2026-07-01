'use server'

import { db } from '@/lib/db'
import { stakeholders, stakeholderFeedback, staffSuggestions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextStakeholderReference } from '@/lib/db/stakeholders'

export async function createStakeholder(data: {
  name: string
  type: string
  needs?: string
  influence: number
  interaction: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  const reference = await getNextStakeholderReference()
  const isPip = data.influence >= 2 && data.interaction >= 2
  await db.insert(stakeholders).values({
    reference,
    name: data.name,
    type: data.type as 'client' | 'fournisseur' | 'partenaire' | 'employe' | 'actionnaire' | 'autorite_reglementaire' | 'communaute' | 'autre',
    needs: data.needs,
    influence: data.influence,
    interaction: data.interaction,
    isPip,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    notes: data.notes,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/stakeholders')
  return { success: true }
}

export async function updateStakeholder(id: string, data: {
  name?: string
  needs?: string
  influence?: number
  interaction?: number
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() }
  if (data.influence !== undefined && data.interaction !== undefined) {
    updates.isPip = data.influence >= 2 && data.interaction >= 2
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(stakeholders).set(updates as any).where(eq(stakeholders.id, id))
  revalidatePath('/admin/stakeholders')
  revalidatePath(`/admin/stakeholders/${id}`)
  return { success: true }
}

export async function addStakeholderFeedback(data: {
  stakeholderId: string
  channel: string
  date: string
  summary: string
  satisfactionScore?: number
  responseActions?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(stakeholderFeedback).values({
    stakeholderId: data.stakeholderId,
    channel: data.channel as 'enquete_satisfaction' | 'reunion' | 'email' | 'reclamation' | 'audit' | 'autre',
    date: data.date,
    summary: data.summary,
    satisfactionScore: data.satisfactionScore,
    responseActions: data.responseActions,
    createdBy: session.user.id,
  })
  revalidatePath(`/admin/stakeholders/${data.stakeholderId}`)
  return { success: true }
}

export async function addStaffSuggestion(data: {
  date: string
  dept: string
  suggestionText: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(staffSuggestions).values({
    date: data.date,
    dept: data.dept as 'AC' | 'CO' | 'ET' | 'MI' | 'RE1' | 'RE2' | 'RH',
    suggestionText: data.suggestionText,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/stakeholders')
  return { success: true }
}
