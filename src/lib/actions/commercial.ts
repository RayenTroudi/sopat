'use server'

import { db } from '@/db'
import { commercialOffers } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextOfferReference, type OfferStatus } from '@/lib/db/commercial'

function canManageOffers(role: string) {
  return ['admin', 'direction', 'etudes_chef'].includes(role)
}

export async function createOffer(data: {
  clientId?: string
  clientName?: string
  projectTitle: string
  projectType?: string
  description?: string
  amount?: string
  currency?: string
  sentDate?: string
  validityDate?: string
  responsible?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageOffers(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  const reference = await getNextOfferReference()
  const [row] = await db.insert(commercialOffers).values({
    reference,
    clientId: data.clientId || null,
    clientName: data.clientName,
    projectTitle: data.projectTitle,
    projectType: data.projectType,
    description: data.description,
    amount: data.amount || null,
    currency: data.currency || 'TND',
    sentDate: data.sentDate || null,
    validityDate: data.validityDate || null,
    responsible: data.responsible,
    notes: data.notes,
    createdBy: session.user.userId,
  }).returning({ id: commercialOffers.id })

  revalidatePath('/admin/commercial/offers')
  return { success: true, id: row.id }
}

export async function updateOffer(
  id: string,
  data: Partial<{
    clientName: string
    projectTitle: string
    projectType: string
    description: string
    amount: string
    currency: string
    sentDate: string
    validityDate: string
    status: OfferStatus
    decisionDate: string
    lostReason: string
    projectId: string
    responsible: string
    notes: string
  }>,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageOffers(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  await db
    .update(commercialOffers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(commercialOffers.id, id))
  revalidatePath('/admin/commercial/offers')
  revalidatePath(`/admin/commercial/offers/${id}`)
  return { success: true }
}

export async function deleteOffer(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageOffers(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  await db
    .update(commercialOffers)
    .set({ deletedAt: new Date() })
    .where(eq(commercialOffers.id, id))
  revalidatePath('/admin/commercial/offers')
  return { success: true }
}
