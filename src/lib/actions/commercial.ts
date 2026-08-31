'use server'

import { db } from '@/db'
import { commercialOffers } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextOfferReference, type OfferStatus } from '@/lib/db/commercial'
import { canEditBordereau, getDefaultVatRate } from '@/lib/db/bordereau'

/** The offer module's existing write list, unchanged. */
function canManageOffers(role: string) {
  return canEditBordereau(role)
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
  // A NEW document takes the configured VAT rate. Existing offers keep the 0
  // they were created with — adding VAT support must not move a single figure
  // that has already been quoted to a client.
  const vatRate = await getDefaultVatRate()
  const [row] = await db.insert(commercialOffers).values({
    reference,
    vatRate: vatRate.toFixed(4),
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

  // Champs listés explicitement : `...data` écrirait toute colonne présente dans
  // la charge utile — une server action est appelable directement par le client,
  // donc la signature TypeScript n'est pas une barrière. reference, createdBy,
  // createdAt et deletedAt restent hors d'atteinte.
  await db
    .update(commercialOffers)
    .set({
        ...(data.clientName !== undefined && { clientName: data.clientName }),
          ...(data.projectTitle !== undefined && { projectTitle: data.projectTitle }),
        ...(data.projectType !== undefined && { projectType: data.projectType }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.sentDate !== undefined && { sentDate: data.sentDate }),
        ...(data.validityDate !== undefined && { validityDate: data.validityDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.decisionDate !== undefined && { decisionDate: data.decisionDate }),
        ...(data.lostReason !== undefined && { lostReason: data.lostReason }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
        ...(data.responsible !== undefined && { responsible: data.responsible }),
        ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    })
    .where(eq(commercialOffers.id, id))
  revalidatePath('/admin/commercial/offers')
  revalidatePath(`/admin/commercial/offers/${id}`)
  return { success: true }
}

/**
 * Les server actions `addOfferLineItem` / `deleteOfferLineItem` ont été
 * retirées au profit de `/api/commercial/offers/[id]/bordereau/lines`.
 *
 * Elles portaient deux défauts que leur signature masquait :
 *
 * 1. `deleteOfferLineItem(lineId, offerId)` vérifiait le verrou de `offerId`
 *    mais supprimait `lineId` SANS contrôler qu'il appartenait à cette offre.
 *    N'importe quel rédacteur pouvait donc supprimer une ligne de n'importe
 *    quelle offre — y compris approuvée et verrouillée — en citant l'offre
 *    déverrouillée de son choix.
 * 2. `addOfferLineItem` acceptait un `parentId` arbitraire, sans vérifier qu'il
 *    désignait un nœud de la même offre ni qu'il pouvait porter un enfant.
 *
 * La route les remplace : l'identifiant de l'offre est dans la clause WHERE de
 * chaque écriture, le parent est validé, et chaque modification est journalisée
 * avec sa valeur d'avant et sa valeur d'après.
 */

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
