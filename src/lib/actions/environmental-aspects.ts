'use server'

import { db } from '@/db'
import { environmentalAspects } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextAesReference, AES_SIGNIFICANCE_THRESHOLD } from '@/lib/db/environmental-aspects'

function canManage(role: string) {
  return ['admin', 'direction'].includes(role)
}

export async function createEnvironmentalAspect(data: {
  activity: string
  aspect: string
  impact?: string
  condition: 'normale' | 'anormale' | 'urgence'
  frequency?: number
  gravity?: number
  controlMeasures?: string
  legalRequirement?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const significance =
    data.frequency && data.gravity ? data.frequency * data.gravity : null

  const reference = await getNextAesReference()
  const [row] = await db.insert(environmentalAspects).values({
    reference,
    activity: data.activity,
    aspect: data.aspect,
    impact: data.impact,
    condition: data.condition,
    frequency: data.frequency,
    gravity: data.gravity,
    significance,
    isSignificant: significance != null && significance >= AES_SIGNIFICANCE_THRESHOLD,
    controlMeasures: data.controlMeasures,
    legalRequirement: data.legalRequirement,
    createdBy: session.user.userId,
  }).returning({ id: environmentalAspects.id })

  revalidatePath('/admin/environment/aspects')
  return { success: true, id: row.id }
}

export async function updateEnvironmentalAspect(
  id: string,
  data: Partial<{
    activity: string
    aspect: string
    impact: string
    condition: 'normale' | 'anormale' | 'urgence'
    frequency: number
    gravity: number
    controlMeasures: string
    legalRequirement: string
    status: 'identified' | 'controlled' | 'closed'
  }>,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() }
  if (data.frequency != null && data.gravity != null) {
    const significance = data.frequency * data.gravity
    updates.significance = significance
    updates.isSignificant = significance >= AES_SIGNIFICANCE_THRESHOLD
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(environmentalAspects).set(updates as any).where(eq(environmentalAspects.id, id))
  revalidatePath('/admin/environment/aspects')
  revalidatePath(`/admin/environment/aspects/${id}`)
  return { success: true }
}

export async function deleteEnvironmentalAspect(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  await db
    .update(environmentalAspects)
    .set({ deletedAt: new Date() })
    .where(eq(environmentalAspects.id, id))
  revalidatePath('/admin/environment/aspects')
  return { success: true }
}
