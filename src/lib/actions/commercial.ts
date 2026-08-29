'use server'

import { db } from '@/db'
import { commercialOffers, offerLineItems } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq, sql } from 'drizzle-orm'
import { getNextOfferReference, type OfferStatus } from '@/lib/db/commercial'
import {
  assertNotLocked,
  canEditBordereau,
  getDefaultVatRate,
  syncOfferTotals,
} from '@/lib/db/bordereau'
import { lineTotal } from '@/lib/bordereau-calc'

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
 * Ajoute une ligne au bordereau, sous une section ou une catégorie choisie.
 *
 * `parentId` absent = ligne à la racine, ce qui est exactement la forme plate
 * que le module produisait avant FOR-CO-02 : les offres existantes continuent
 * de fonctionner sans changer de comportement.
 */
export async function addOfferLineItem(data: {
  offerId: string
  parentId?: string | null
  designation: string
  description?: string | null
  norme?: string | null
  unit?: string
  quantity: string
  unitPrice: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageOffers(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  const locked = await assertNotLocked(data.offerId)
  if (locked) return { success: false, error: locked }

  const quantity = Number(data.quantity)
  const unitPrice = Number(data.unitPrice)
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity < 0 || unitPrice < 0)
    return { success: false, error: 'Quantité ou prix unitaire invalide' }

  const [{ nextPosition }] = await db
    .select({
      nextPosition: sql<number>`coalesce(max(${offerLineItems.position}), -1) + 1`,
    })
    .from(offerLineItems)
    .where(eq(offerLineItems.offerId, data.offerId))

  const total = lineTotal(quantity, unitPrice)
  await db.insert(offerLineItems).values({
    offerId: data.offerId,
    parentId: data.parentId || null,
    lineType: 'item',
    position: Number(nextPosition),
    designation: data.designation,
    description: data.description || null,
    norme: data.norme || null,
    unit: data.unit || 'U',
    quantity: String(quantity),
    unitPrice: String(unitPrice),
    total: total === null ? null : total.toFixed(3),
    createdBy: session.user.userId,
  })
  await syncOfferTotals(db, data.offerId)
  revalidatePath(`/admin/commercial/offers/${data.offerId}`)
  revalidatePath('/admin/commercial/offers')
  return { success: true }
}

/**
 * Supprime une ligne et, par cascade, tout ce qu'elle porte : supprimer une
 * catégorie emporte ses lignes, ce que la hiérarchie rend explicite.
 */
export async function deleteOfferLineItem(lineId: string, offerId: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManageOffers(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  const locked = await assertNotLocked(offerId)
  if (locked) return { success: false, error: locked }

  await db.delete(offerLineItems).where(eq(offerLineItems.id, lineId))
  await syncOfferTotals(db, offerId)
  revalidatePath(`/admin/commercial/offers/${offerId}`)
  revalidatePath('/admin/commercial/offers')
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
