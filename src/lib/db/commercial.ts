import { db } from '@/db'
import { commercialOffers, offerLineItems, clients, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type CommercialOffer = typeof commercialOffers.$inferSelect
export type OfferLineItem = typeof offerLineItems.$inferSelect

export type OfferStatus =
  | 'en_preparation'
  | 'envoyee'
  | 'en_negociation'
  | 'gagnee'
  | 'perdue'
  | 'annulee'

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  en_preparation: 'En préparation',
  envoyee: 'Envoyée',
  en_negociation: 'En négociation',
  gagnee: 'Gagnée',
  perdue: 'Perdue',
  annulee: 'Annulée',
}

export async function getOffers(filters?: { status?: OfferStatus }) {
  return db
    .select({
      offer: commercialOffers,
      clientCompany: clients.companyName,
      creatorName: users.name,
    })
    .from(commercialOffers)
    .leftJoin(clients, eq(commercialOffers.clientId, clients.id))
    .leftJoin(users, eq(commercialOffers.createdBy, users.id))
    .where(
      and(
        isNull(commercialOffers.deletedAt),
        filters?.status ? eq(commercialOffers.status, filters.status) : undefined,
      )
    )
    .orderBy(desc(commercialOffers.createdAt))
}

export async function getOfferById(id: string) {
  const [row] = await db
    .select({
      offer: commercialOffers,
      clientCompany: clients.companyName,
    })
    .from(commercialOffers)
    .leftJoin(clients, eq(commercialOffers.clientId, clients.id))
    .where(and(eq(commercialOffers.id, id), isNull(commercialOffers.deletedAt)))
  return row ?? null
}

export async function getOfferLineItems(offerId: string) {
  return db
    .select()
    .from(offerLineItems)
    .where(eq(offerLineItems.offerId, offerId))
    .orderBy(offerLineItems.position, offerLineItems.createdAt)
}

export async function getNextOfferReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(commercialOffers)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `OF-${year}-${seq}`
}
