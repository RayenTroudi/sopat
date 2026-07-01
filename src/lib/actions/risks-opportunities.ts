'use server'

import { db } from '@/db'
import { risksOpportunities, roActions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextRoReference } from '@/lib/db/risks-opportunities'

export async function createRiskOpportunity(data: {
  type: 'risk' | 'opportunity'
  category: string
  description: string
  context?: string
  gravity?: number
  probability?: number
  priority?: number
  importance?: number
  owner?: string
  targetDate?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const reference = await getNextRoReference(data.type)
  const criticality =
    data.gravity && data.probability ? data.gravity * data.probability : null
  const score =
    data.priority && data.importance ? data.priority * data.importance : null

  await db.insert(risksOpportunities).values({
    reference,
    type: data.type,
    category: data.category as 'contexte_interne' | 'contexte_externe' | 'partie_interessee' | 'processus' | 'environnement' | 'autre',
    description: data.description,
    context: data.context,
    gravity: data.gravity,
    probability: data.probability,
    criticality,
    priority: data.priority,
    importance: data.importance,
    score,
    owner: data.owner,
    targetDate: data.targetDate,
    notes: data.notes,
    createdBy: session.user.userId,
  })

  revalidatePath('/admin/risks-opportunities')
  return { success: true }
}

export async function updateRiskOpportunity(
  id: string,
  data: Partial<{
    description: string
    context: string
    gravity: number
    probability: number
    priority: number
    importance: number
    status: string
    owner: string
    targetDate: string
    notes: string
  }>
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const updates: Record<string, unknown> = { ...data }
  if (data.gravity && data.probability) {
    updates.criticality = data.gravity * data.probability
  }
  if (data.priority && data.importance) {
    updates.score = data.priority * data.importance
  }
  updates.updatedAt = new Date()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(risksOpportunities).set(updates as any).where(eq(risksOpportunities.id, id))
  revalidatePath('/admin/risks-opportunities')
  revalidatePath(`/admin/risks-opportunities/${id}`)
  return { success: true }
}

export async function deleteRiskOpportunity(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db
    .update(risksOpportunities)
    .set({ deletedAt: new Date() })
    .where(eq(risksOpportunities.id, id))
  revalidatePath('/admin/risks-opportunities')
  return { success: true }
}

export async function addRoAction(data: {
  roId: string
  description: string
  responsible?: string
  targetDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(roActions).values({
    roId: data.roId,
    description: data.description,
    responsible: data.responsible,
    targetDate: data.targetDate,
    createdBy: session.user.userId,
  })
  revalidatePath(`/admin/risks-opportunities/${data.roId}`)
  return { success: true }
}
